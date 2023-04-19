import {
  EntityManager,
  ObjectLiteral,
  QueryRunner,
  SelectQueryBuilder,
} from 'typeorm';
import dataSource from '../data-source';

export type ExecutePipeline<I extends ObjectLiteral> = <
  O extends Record<string, any>
>(
  domainEntity: I,
  rawEntity: Record<string, any>
) => I;

export async function execute<U extends ObjectLiteral>(
  qb: SelectQueryBuilder<U>,
  ...mappers: ExecutePipeline<U>[]
) {
  const { entities, raw } = await qb.getRawAndEntities();
  return entities.map((entity, index) => {
    return mappers.reduce((acc, mapper) => {
      return mapper(acc, raw[index]);
    }, entity);
  });
}

/**
 * Begin a transaction and execute a computation. If the computation succeeds, the transaction is committed. If the computation fails, the transaction is rolled back.
 *
 * @param computation async function that takes a `EntityManager` and returns a `Promise`
 * @returns the result of the computation
 * @throws the error thrown by the computation or the error thrown by the transaction
 * @example
 *
 * // If the computation succeeds, the transaction is committed
 *
 * const result = await useTransaction(async (manager) => {
 *  const user = await manager.findOne(User, 1);
 *  user.name = 'New Name';
 *  await manager.save(user);
 *  return user;
 * });
 *
 * // result is the updated user
 *
 * // If the computation fails, the transaction is rolled back
 * const result = await useTransaction(async (manager) => {
 *  const user = await manager.findOne(User, 1);
 *  user.name = 'New Name';
 *  await manager.save(user);
 *  throw new Error('Something went wrong');
 * });
 *
 * // result is undefined
 * // If the transaction fails, the error is thrown
 * const result = await useTransaction(async (manager) => {
 *  const user = await manager.findOne(User, 1);
 *  user.name = 'New Name';
 *  await manager.save(user);
 *  await manager.query('DROP TABLE users');
 * });
 *
 */
export async function useTransaction<TResult>(
  computation: (manager: EntityManager) => Promise<TResult>
) {
  let queryRunner: QueryRunner | null = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const result = await computation(queryRunner.manager);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
    queryRunner = null;
    throw error;
  }
}
