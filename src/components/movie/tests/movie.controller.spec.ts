import { Test, TestingModule } from '@nestjs/testing';
import { MovieController } from '../movie.controller';
import { MovieService } from '../movie.service';
import { NotFoundException } from '@nestjs/common';

const mockMovieService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('MovieController', () => {
  let controller: MovieController;
  let service: jest.Mocked<MovieService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovieController],
      providers: [{ provide: MovieService, useValue: mockMovieService }],
    }).compile();

    controller = module.get<MovieController>(MovieController);
    service = module.get(MovieService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of movies', async () => {
      const movies = [
        {
          id: 1,
          title: 'Movie 1',
          description: 'Description 1',
          director: 'Director 1',
          year: 2020,
          genre: 'Action',
        },
      ];
      service.findAll.mockResolvedValue(movies);

      const result = await controller.findAll();

      expect(result).toEqual(movies);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single movie', async () => {
      const movie = {
        id: 1,
        title: 'Movie 1',
        description: 'Description 1',
        director: 'Director 1',
        year: 2020,
        genre: 'Action',
      };
      service.findOne.mockResolvedValue(movie);

      const result = await controller.findOne(1);

      expect(result).toEqual(movie);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if movie not found', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return the movie', async () => {
      const createDto = {
        title: 'New Movie',
        description: 'New description',
        director: 'New director',
        year: 2023,
        genre: 'Drama',
      };
      const movie = { id: 1, ...createDto };
      service.create.mockResolvedValue(movie);

      const result = await controller.create(createDto);

      expect(result).toEqual(movie);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update and return the updated movie', async () => {
      const updateDto = {
        title: 'Updated Movie',
        description: 'Updated description',
        director: 'Updated director',
        year: 2024,
        genre: 'Comedy',
      };
      const movie = { id: 1, ...updateDto };
      service.update.mockResolvedValue(movie);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(movie);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should remove the movie', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);

      expect(result).toEqual({ message: 'Movie deleted successfully' });
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
