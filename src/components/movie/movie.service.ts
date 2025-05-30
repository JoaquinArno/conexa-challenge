import {
  Injectable,
  Inject,
  NotFoundException,
  LoggerService,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LOGGER_SERVICE } from '../constants/constants.service';
import { Movie } from './entities/movie.entity';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,

    @Inject(LOGGER_SERVICE)
    private readonly logger: LoggerService
  ) {}

  async findAll(): Promise<Movie[]> {
    this.logger.log('Fetching all movies');
    return await this.movieRepository.find();
  }

  async findOne(id: number): Promise<Movie> {
    this.logger.log(`Fetching movie with id: ${id}`);
    const movie = await this.movieRepository.findOne({ where: { id } });
    if (!movie) {
      this.logger.warn(`Movie with id ${id} not found`);
      throw new NotFoundException('Movie not found');
    }
    return movie;
  }

  async create(dto: CreateMovieDto): Promise<Movie> {
    this.logger.log(`Creating new movie with title: ${dto.title}`);
    const newMovie = this.movieRepository.create(dto);
    return await this.movieRepository.save(newMovie);
  }

  async update(id: number, dto: UpdateMovieDto): Promise<Movie> {
    this.logger.log(`Updating movie with id: ${id}`);
    const movie = await this.findOne(id);
    const updated = Object.assign(movie, dto);
    return await this.movieRepository.save(updated);
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Removing movie with id: ${id}`);
    const movie = await this.findOne(id);
    await this.movieRepository.remove(movie);
    this.logger.log(`Movie with id ${id} removed successfully`);
  }
}
