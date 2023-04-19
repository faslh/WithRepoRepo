import { IsNumberString, IsObject, IsOptional } from 'class-validator';
import { OrderByCondition } from 'typeorm';

function isNullOrUndefined<T>(value: T): value is T {
  return value === undefined || value === null;
}

export class Pagination {
  @IsOptional()
  @IsNumberString()
  private page?: number | string;

  @IsOptional()
  @IsNumberString()
  private size?: number | string;

  @IsOptional()
  @IsObject()
  private order?: Record<string, any>;

  getOrder(): OrderByCondition {
    if (this.order) {
      return Object.keys(this.order).reduce((acc, key) => {
        const direction = this.order?.[key].toUpperCase();
        if (['DESC', 'ASC'].includes(direction)) {
          acc[key] = this.order?.[key].toUpperCase();
        }
        return acc;
      }, {} as Record<string, any>);
    }
    return {};
  }

  skip() {
    return (isNullOrUndefined(this.page) ? 0 : +this.page) * this.limit();
  }

  limit() {
    return isNullOrUndefined(this.size) ? 0 : +this.size;
  }
}

export class PaginationResult<T> {
  constructor(public list: T[], public count?: number) {
    if (isNullOrUndefined(this.count)) {
      this.count = list.length;
    }
  }
}
