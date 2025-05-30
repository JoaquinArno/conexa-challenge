import { Test, TestingModule } from '@nestjs/testing';
import { MovieService } from '../movie.service';
import { Repository } from 'typeorm';
import { Movie } from '../entities/movie.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

const mockMovieRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

describe('MovieService', () => {
  let service: MovieService;
  let repository: Repository<Movie>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovieService,
        {
          provide: getRepositoryToken(Movie),
          useValue: mockMovieRepository,
        },
      ],
    }).compile();

    service = module.get<MovieService>(MovieService);
    repository = module.get<Repository<Movie>>(getRepositoryToken(Movie));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all movies', async () => {
      const movies = [{ id: 1, title: 'Movie 1' }];
      mockMovieRepository.find.mockResolvedValue(movies);

      const result = await service.findAll();

      expect(result).toEqual(movies);
      expect(mockMovieRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a movie by id', async () => {
      const movie = { id: 1, title: 'Movie 1' };
      mockMovieRepository.findOne.mockResolvedValue(movie);

      const result = await service.findOne(1);

      expect(result).toEqual(movie);
      expect(mockMovieRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if movie not found', async () => {
      mockMovieRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return the movie', async () => {
      const createDto = {
        title: 'New Movie',
        description: 'Desc',
        director: 'Dir',
        year: 2020,
        genre: 'Action',
      };
      const movie = { id: 1, ...createDto };
      mockMovieRepository.save.mockResolvedValue(movie);

      const result = await service.create(createDto);

      expect(result).toEqual(movie);
      expect(mockMovieRepository.save).toHaveBeenCalledWith(createDto);
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockMovieRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(service.create({} as any)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('update', () => {
    it('should update and return the updated movie', async () => {
      const movie = { id: 1, title: 'Old Title' };
      const updateDto = { title: 'Updated Title' };
      mockMovieRepository.findOne.mockResolvedValue(movie);
      mockMovieRepository.save.mockResolvedValue({ ...movie, ...updateDto });

      const result = await service.update(1, updateDto);

      expect(result.title).toEqual(updateDto.title);
      expect(mockMovieRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if movie not found', async () => {
      mockMovieRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, {} as any)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should delete a movie by id', async () => {
      mockMovieRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove(1);

      expect(result).toEqual({ message: 'Movie deleted successfully' });
      expect(mockMovieRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if movie not found', async () => {
      mockMovieRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
