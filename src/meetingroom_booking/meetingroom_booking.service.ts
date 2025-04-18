import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateMeetingroomBookingDto } from './dto/create-meetingroom_booking.dto';
import { UpdateMeetingroomBookingDto } from './dto/update-meetingroom_booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MeetingroomBooking } from './entities/meetingroom_booking.entity';
import { QueryFailedError, Repository } from 'typeorm';
import { MeetingroomDetailsService } from '../meetingroom_details/meetingroom_details.service';
import { FloorDetailsService } from '../floor_details/floor_details.service';
import { OverallBookingService } from '../overall_booking/overall_booking.service';
import { UserService } from '../user/user.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import * as moment from 'moment-timezone';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class MeetingroomBookingService {
  constructor(
    @InjectRepository(MeetingroomBooking)
    private readonly repo: Repository<MeetingroomBooking>,
    private readonly meetingRoomService: MeetingroomDetailsService,
    private readonly floorDetail: FloorDetailsService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => OverallBookingService))
    private overallBookingService: OverallBookingService,
  ) {}

  //post meeting room boking
  async create(dto: CreateMeetingroomBookingDto) {
    // 1) basic time‐range check
    if (dto.end_time <= dto.start_time) {
      throw new BadRequestException('Please enter valid start and end time');
    }

    // 2) normalize Date objects
    const date = new Date(dto.date);
    const start = new Date(dto.start_time);
    const end = new Date(dto.end_time);

    // 3) fetch related entities
    const meetingRoom = await this.meetingRoomService.findOne(dto.room_id);
    const floor = await this.floorDetail.findOne(dto.floorId);
    if (!floor) {
      throw new BadRequestException(`Floor ${dto.floorId} not found`);
    }

    // 4) manually instantiate the entity
    const booking = new MeetingroomBooking();
    booking.token       = dto.token;
    booking.room_id     = dto.room_id;
    booking.room_name   = dto.room_name;
    booking.date        = date;
    booking.start_time  = start;
    booking.end_time    = end;
    booking.floorId     = dto.floorId;
    booking.floor       = floor;
    booking.meetingRoom = meetingRoom;
    booking.status      = dto.status;
    booking.users       = dto.users;

    try {
      // 5) save returns a single MeetingroomBooking
      const saved = await this.repo.save(booking);

      // now saved.booking_id, saved.floorId, saved.room_name, etc. all exist
      return await this.overallBookingService.create({
        amenity:   'Meeting Room',
        date,
        bookingID: saved.booking_id,
        token:     dto.token,
        details: [
          start.toISOString(),
          end.toISOString(),
          saved.floorId.toString(),
          saved.room_name,
          saved.users.toString(),
        ],
      });
    } catch (err) {
      if (err instanceof QueryFailedError && err.message.includes('composite-keys')) {
        throw new ConflictException('That time slot is already booked');
      }
      throw new InternalServerErrorException('Failed to create booking');
    }
  }


  findAll() {
    return this.repo.find();
  }

  //find booking by booking id
  async findOne(id: number) {
    const booking = await this.repo.findOne({ where: { booking_id: id } });
    if (!booking)
      throw new HttpException('Booking not found', HttpStatus.BAD_REQUEST);
    return booking;
  }

  //find upcoming bookings of user
  async findByToken(token: string) {
    const now = new Date(new Date()).setUTCHours(0, 0, 0, 0);
    const now1 = new Date(now);
    const b = await this.repo
      .createQueryBuilder('booking')
      .andWhere('booking.date >= :date', { date: now1 })
      .getMany();
    const booking: MeetingroomBooking[] = [];
    const user = await this.userService.findOne(token);
    const email = user[0].email;
    for (const i of b) {
      if (i.token == token || i.users.includes(email)) booking.push(i);
    }
    if (booking.length == 0)
      throw new HttpException('Booking not found', HttpStatus.BAD_REQUEST);
    return { seatingData: booking };
  }

  //update booking
  async update(
    id: number,
    updateMeetingroomBookingDto: UpdateMeetingroomBookingDto,
  ) {
    const booking = await this.repo.findOne({ where: { booking_id: id } });
    if (!booking) {
      throw new NotFoundException(`Meeting‑room booking ${id} not found`);
    }
    
    const bookingID = booking?.booking_id;
    const amenity = 'meetingRoom';
    const overall_booking = await this.overallBookingService.findByBidAmenity(
      bookingID,
      amenity,
    );

    //convert date to appropriate format
    if (updateMeetingroomBookingDto.date) {
      updateMeetingroomBookingDto.date = new Date(
        updateMeetingroomBookingDto.date,
      );
      overall_booking[0].date = updateMeetingroomBookingDto.date;
    }
    if (updateMeetingroomBookingDto.start_time) {
      updateMeetingroomBookingDto.start_time = new Date(
        updateMeetingroomBookingDto.start_time,
      );
      overall_booking[0].details[0] =
        updateMeetingroomBookingDto.start_time.toISOString();
    }
    if (updateMeetingroomBookingDto.end_time) {
      updateMeetingroomBookingDto.end_time = new Date(
        updateMeetingroomBookingDto.end_time,
      );
      overall_booking[0].details[1] =
        updateMeetingroomBookingDto.end_time.toISOString();
    }
    if (
      updateMeetingroomBookingDto.start_time &&
      updateMeetingroomBookingDto.end_time
    )
      if (
        updateMeetingroomBookingDto.start_time >=
        updateMeetingroomBookingDto.end_time
      )
        throw new HttpException(
          'Please enter valid start time and end time',
          HttpStatus.BAD_REQUEST,
        );

    //add floor id
    if (updateMeetingroomBookingDto.floorId)
      overall_booking[0].details[2] =
        updateMeetingroomBookingDto.floorId.toString();

    //add room name
    if (updateMeetingroomBookingDto.room_name)
      overall_booking[0].details[3] = updateMeetingroomBookingDto.room_name;

    //add users
    if (updateMeetingroomBookingDto.users)
      overall_booking[0].details[4] =
        updateMeetingroomBookingDto.users.toString();

    //update in meeting room booking table
    const updatedBooking = await this.repo.update(
      id,
      updateMeetingroomBookingDto,
    );
    //update in overall booking table
    const b = await this.overallBookingService.updateMeetingRoom(
      id,
      overall_booking,
    );
    return updatedBooking;
  }

  remove(id: number) {
    //remove from mr booking and overall booking table
    const booking = this.repo.delete(id);
    return this.overallBookingService.deleteByID(id, 'Meeting Room');
  }

  //get number of MRs available based on current date and time
  async getTotalAvailability() {
    const total_rooms = (await this.meetingRoomService.findAll()).length;
    const date = moment.utc(new Date().toISOString());
    // console.log(date)
    const bookings_by_date = await this.repo
      .createQueryBuilder('booking')
      .where(
        '(booking.start_time < :end_time AND booking.start_time >= :start_time)',
      )
      .orWhere(
        '(booking.end_time <= :end_time AND booking.start_time > :start_time)',
      )
      .orWhere(
        '(booking.start_time <= :end_time AND booking.end_time >= :start_time)',
      )
      .setParameter('start_time', date)
      .setParameter('end_time', date)
      .getMany();
    console.log(bookings_by_date);
    return total_rooms - bookings_by_date.length;
  }

  //get MRs available based on date, time and capacity
  async getAvailabilityByTime(dto: GetAvailabilityDto) {
    const dateOnly = new Date(dto.date);
    dateOnly.setUTCHours(0, 0, 0, 0);
  
    const start = new Date(dto.start_time);
    const end = new Date(dto.end_time);
  
    if (start >= end) {
      throw new BadRequestException('Please enter valid start and end time');
    }
  
    // Fix: use a date range for accurate filtering
    const nextDay = new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000);
  
    const overlappingBookings = await this.repo
      .createQueryBuilder('booking')
      .where('booking.date >= :startOfDay AND booking.date < :endOfDay', {
        startOfDay: dateOnly,
        endOfDay: nextDay,
      })
      .andWhere('booking.start_time < :end AND booking.end_time > :start', {
        start,
        end,
      })
      .getMany();
  
    const allAvailableRooms = await this.meetingRoomService.getRoomByCapacity(dto.capacity);
  
    const bookedRoomIds = new Set(overlappingBookings.map((b) => b.room_id));
  
    const availableRooms = allAvailableRooms.filter((room) => !bookedRoomIds.has(room.roomId));
  
    return availableRooms;
  }
}
