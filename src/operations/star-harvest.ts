import { firstBy } from 'thenby';
import { IGameState } from '../models/game-state';
import { Minion } from '../models/minion';
import { IOperation, ISubOperation, ITransferrable, OperationBase, OperationStatus } from '../models/operation';
import { GameStar } from '../models/star';
import Point, { point } from '../utils/point';

export class StarHarvestOperation extends OperationBase implements IOperation {
  public readonly name: string;
  public readonly harvestOperation: HarvestPowerSubOperation;
  public readonly deliveryOperation: DeliverToBaseSubOperation;
  public readonly harvestStarId: string;
  // the harvest is always active
  public readonly active: boolean = true;
  // unlimited harvesters
  public readonly unlimitedDemand: boolean = true;
  private recommendedHarvesters = 3;

  constructor(gameState: IGameState, public readonly priority: number, targetStar: GameStar) {
    super();
    this.harvestOperation = new HarvestPowerSubOperation(this, gameState, targetStar);
    this.deliveryOperation = new DeliverToBaseSubOperation(this, gameState, targetStar);
    this.harvestStarId = targetStar.id;
    this.name = `Harvest ${targetStar.id}`;
  }

  public get minionDemand(): number {
    const harvesters = this.listAllAssignedMinions();
    if (harvesters.length <= this.recommendedHarvesters) {
      return this.recommendedHarvesters - harvesters.length;
    }

    return 0 - this.harvestOperation.idleHarvesters.size;
  }

  public get subOperations(): ISubOperation[] {
    return [this.harvestOperation, this.deliveryOperation];
  }

  public step(gameState: IGameState): OperationStatus {
    const star = gameState.stars.find((s) => s.id == this.harvestStarId);
    if (star === undefined) {
      throw new Error(`Could not find star with id ${this.harvestStarId}`);
    }

    this.recommendedHarvesters =
      (star.nextCharge - star.recommendedPassiveChargeForStar()) *
      (2 +
        Math.ceil(
          (Point.getDistance(this.harvestOperation.harvestPoint, this.deliveryOperation.deliveryPoint) * 2) /
            SPIRIT_SPEED /
            10
        ));
    this.harvestOperation.idleHarvesters.clear();
    this.harvestOperation.step(gameState);
    this.deliveryOperation.step(gameState);

    return 'active';
  }

  public suspendOperation(gameState: IGameState): Minion[] {
    // you cannot suspend harvesting
    // but you can remove all minions
    const allAssignedMinions = [
      ...this.assignedMinions,
      ...this.harvestOperation.assignedMinions,
      ...this.deliveryOperation.assignedMinions,
    ].map((id) => gameState.getMinion(id));

    for (const minion of allAssignedMinions) {
      minion.unassign(gameState);
    }

    return allAssignedMinions;
  }

  public tryAssignMinionsFromSelection(gameState: IGameState, minions: Minion[], max: number): Minion[] {
    // pick the minions closest to the harvest route
    const minionsToTake = minions
      .sort(
        (a, b) =>
          Math.min(
            Point.getDistance(a.position, this.harvestOperation.harvestPoint),
            Point.getDistance(a.position, this.deliveryOperation.deliveryPoint)
          ) -
          Math.min(
            Point.getDistance(b.position, this.harvestOperation.harvestPoint),
            Point.getDistance(b.position, this.deliveryOperation.deliveryPoint)
          )
      )
      .slice(0, max);

    for (const minion of minionsToTake) {
      const currentCharge = minion.entity.energy / minion.entity.energy_capacity;
      const distanceToHarvest = Point.getDistance(minion.position, this.harvestOperation.harvestPoint);
      const distanceToDelivery = Point.getDistance(minion.position, this.deliveryOperation.deliveryPoint);
      // pick the best role to start as
      // distance to harvest/delivery point weighted by how much % charge the minion has
      // whichever is smaller
      const weightedHarvest = distanceToHarvest * (1 - currentCharge);
      const weightedDelivery = distanceToDelivery * currentCharge;

      if (weightedHarvest > weightedDelivery) {
        this.harvestOperation.transfer(gameState, minion);
      } else {
        this.deliveryOperation.transfer(gameState, minion);
      }
    }

    return minionsToTake;
  }

  public tryUnassignMinion(gameState: IGameState): Minion | null {
    // find the least valuable minion to unassign
    // the closer the minion is to delivering energy to base, the more valuable it is

    // pick harvesters first
    const harvestMinions = this.harvestOperation.assignedMinions;
    if (harvestMinions.length > 0) {
      // best minion is the one furtherest from harvest point
      const mostExpendableMinion = harvestMinions
        .map((id) => gameState.getMinion(id))
        .sort(
          (a, b) =>
            Point.getDistance(a.position, this.harvestOperation.harvestPoint) -
            Point.getDistance(b.position, this.harvestOperation.harvestPoint)
        )[harvestMinions.length - 1];

      this.harvestOperation.poachMinion(gameState, mostExpendableMinion);
      return mostExpendableMinion;
    }

    const deliveryMinions = this.harvestOperation.assignedMinions;
    if (deliveryMinions.length > 0) {
      // best minion is the one furtherest from delivery point
      const mostExpendableMinion = deliveryMinions
        .map((id) => gameState.getMinion(id))
        .sort(
          (a, b) =>
            Point.getDistance(a.position, this.deliveryOperation.deliveryPoint) -
            Point.getDistance(b.position, this.deliveryOperation.deliveryPoint)
        )[deliveryMinions.length - 1];

      this.deliveryOperation.poachMinion(gameState, mostExpendableMinion);
      return mostExpendableMinion;
    }

    // no minions to unassign
    return null;
  }
}

class HarvestPowerSubOperation extends OperationBase implements ISubOperation, ITransferrable {
  public readonly parentOperation: StarHarvestOperation;
  public harvestPoint: point;
  public readonly idleHarvesters: Set<string> = new Set<string>();
  private readonly starId: string;

  constructor(parent: StarHarvestOperation, gameState: IGameState, targetStar: GameStar) {
    super();
    this.parentOperation = parent;
    const harvestPath = Point.getVector(targetStar.position, gameState.homeBase.position);
    const harvestVector = Point.setDistance(
      harvestPath,
      harvestPath.distance < 2 * (ENERGIZE_RANGE - 1) ? harvestPath.distance / 2 : ENERGIZE_RANGE - 1
    );
    this.harvestPoint = Point.getPointFromPointAtVector(targetStar.position, harvestVector);
    this.starId = targetStar.id;
  }

  public get subOperations(): ISubOperation[] {
    return [] as ISubOperation[];
  }

  public step(gameState: IGameState): OperationStatus {
    for (const minion of this.assignedMinions.map((id) => gameState.getMinion(id))) {
      if (minion.entity.energy == minion.entity.energy_capacity) {
        this.parentOperation.deliveryOperation.transfer(gameState, minion);
        continue;
      }

      this.minionStep(gameState, minion);
    }

    return 'active';
  }

  public transfer(gameState: IGameState, minion: Minion) {
    this.assignMinion(gameState, minion);
    minion.shout(`harvest ${this.starId}`);
    this.minionStep(gameState, minion);
  }

  private minionStep(gameState: IGameState, minion: Minion) {
    // move to star
    minion.moveToPoint(this.harvestPoint);
    if (
      minion.entity.energy <= minion.entity.energy_capacity &&
      Point.getDistance(minion.position, minion.getNearestStar(gameState).position) <= ENERGIZE_RANGE - 1 &&
      !minion.harvest(gameState, false)
    ) {
      this.idleHarvesters.add(minion.id);
    }
  }
}

class DeliverToBaseSubOperation extends OperationBase implements ISubOperation, ITransferrable {
  public readonly parentOperation: StarHarvestOperation;
  public deliveryPoint: point;

  constructor(parent: StarHarvestOperation, gameState: IGameState, targetStar: GameStar) {
    super();
    this.parentOperation = parent;
    const deliveryPath = Point.getVector(gameState.homeBase.position, targetStar.position);
    const deliveryVector = Point.setDistance(
      deliveryPath,
      deliveryPath.distance < 2 * (ENERGIZE_RANGE - 1) ? deliveryPath.distance / 2 : ENERGIZE_RANGE - 1
    );
    this.deliveryPoint = Point.getPointFromPointAtVector(gameState.homeBase.position, deliveryVector);
  }

  public get subOperations(): ISubOperation[] {
    return [] as ISubOperation[];
  }

  public step(gameState: IGameState): OperationStatus {
    type Conduit = { readonly minion: Minion; charges: number };
    const conduits: Set<Conduit> = new Set<Conduit>();
    const notChargingBase: Set<Minion> = new Set<Minion>();
    for (const minion of this.assignedMinions.map((id) => gameState.getMinion(id))) {
      // become harvester if empty
      if (minion.entity.energy == 0) {
        this.parentOperation.harvestOperation.transfer(gameState, minion);
        continue;
      }

      // head to base and charge
      minion.moveToPoint(this.deliveryPoint);
      const canChargeBase = minion.charge(gameState.homeBase);

      // can we daisy-chain charge the base?
      if (canChargeBase && minion.entity.energy < minion.entity.energy_capacity) {
        conduits.add({
          minion: minion,
          charges: minion.entity.energy_capacity - minion.entity.energy + minion.entity.size,
        });
      }
      if (!canChargeBase) {
        notChargingBase.add(minion);
      }
    }

    // sort by those closest to the star first
    for (const minion of notChargingBase.sort(
      firstBy((m) => Point.getDistance(m.position, gameState.homeStar.position))
    )) {
      const conduitIndex = conduits.findIndex(
        (c) =>
          Point.getDistance(minion.position, c.minion.position) <= ENERGIZE_RANGE - 1 && c.charges >= minion.entity.size
      );

      if (conduitIndex < 0) {
        // not in range of any conduits
        continue;
      }

      const conduit = conduits[conduitIndex];
      if (minion.charge(conduit.minion)) {
        // stop moving by moving towards self
        minion.moveTowards(minion);
        // reduce remaining charges on conduit
        conduit.charges -= minion.entity.size;
        if (conduit.charges <= 0) {
          conduits.splice(conduitIndex, 1);
        }
      }
    }

    return 'active';
  }

  public transfer(gameState: IGameState, minion: Minion): void {
    this.assignMinion(gameState, minion);
    minion.shout('deliverToBase');
    // deliver energy to homebase
    minion.moveToPoint(this.deliveryPoint);
    minion.charge(gameState.homeBase);
  }
}
