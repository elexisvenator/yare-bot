import { IGameState } from '../models/game-state';
import { Minion } from '../models/minion';
import { IOperation, ISubOperation, ITransferrable, OperationBase, OperationStatus } from '../models/operation';
import Point, { point } from '../utils/point';

export class HomeBaseHarvestOperation extends OperationBase implements IOperation {
  public readonly harvestOperation: HarvestPowerSubOperation;
  public readonly deliveryOperation: DeliverToBaseSubOperation;
  private minimumHarvesters: number;

  // the harvest is always active
  public readonly active: boolean = true;
  // lowest priority
  public readonly priority: number = 1;
  // unlimited harvesters
  public readonly unlimitedDemand: boolean = true;

  constructor(gameState: IGameState) {
    super();
    this.minimumHarvesters = 0;
    this.harvestOperation = new HarvestPowerSubOperation(this, gameState);
    this.deliveryOperation = new DeliverToBaseSubOperation(this, gameState);
  }

  public get minionDemand(): number {
    const allHarvesters = this.listAllAssignedMinions();
    return this.minimumHarvesters - allHarvesters.length;
  }

  public get subOperations(): ISubOperation[] {
    return [this.harvestOperation, this.deliveryOperation];
  }

  public step(gameState: IGameState): OperationStatus {
    // TODO: Base this on the cost of a new harvestor
    // TODO: Factor in the maximum efficiency of the star
    this.minimumHarvesters = 10;

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

  public handleDeadMinion(gameState: IGameState, minion: Minion): void {
    this.unassignMinion(minion);
  }
}

class HarvestPowerSubOperation extends OperationBase implements ISubOperation, ITransferrable {
  public readonly parentOperation: HomeBaseHarvestOperation;
  public harvestPoint: point;

  constructor(parent: HomeBaseHarvestOperation, gameState: IGameState, ...minions: Minion[]) {
    super();
    this.parentOperation = parent;
    const harvestPath = Point.getVector(gameState.homeStar.position, gameState.homeBase.position);
    const harvestVector = Point.setDistance(
      harvestPath,
      harvestPath.distance < 2 * ENERGIZE_RANGE ? harvestPath.distance / 2 : ENERGIZE_RANGE
    );
    this.harvestPoint = [...Point.getPointFromPointAtVector(gameState.homeStar.position, harvestVector)];
    this.assignMinion(gameState, ...minions);
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
    this.minionStep(gameState, minion);
  }

  private minionStep(gameState: IGameState, minion: Minion) {
    // deliver energy to homebase
    minion.moveToPoint(this.harvestPoint);
    // harvesting stars will happen automatically
  }

  public handleDeadMinion(_gameState: IGameState, minion: Minion): void {
    this.unassignMinion(minion);
  }
}

class DeliverToBaseSubOperation extends OperationBase implements ISubOperation, ITransferrable {
  public readonly parentOperation: HomeBaseHarvestOperation;
  public deliveryPoint: point;

  constructor(parent: HomeBaseHarvestOperation, gameState: IGameState, ...minions: Minion[]) {
    super();
    this.parentOperation = parent;
    const deliveryPath = Point.getVector(gameState.homeBase.position, gameState.homeStar.position);
    const deliveryVector = Point.setDistance(
      deliveryPath,
      deliveryPath.distance < 2 * ENERGIZE_RANGE ? deliveryPath.distance / 2 : ENERGIZE_RANGE
    );
    this.deliveryPoint = [...Point.getPointFromPointAtVector(gameState.homeBase.position, deliveryVector)];
    this.assignMinion(gameState, ...minions);
  }

  public get subOperations(): ISubOperation[] {
    return [] as ISubOperation[];
  }

  public step(gameState: IGameState): OperationStatus {
    const conduits: { readonly minion: Minion; charges: number }[] = [];
    const notChargingBase: Minion[] = [];
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
        conduits.push({ minion: minion, charges: minion.entity.energy_capacity - minion.entity.energy });
      }
      if (!canChargeBase) {
        notChargingBase.push(minion);
      }
    }

    // sort by those closest to the star first
    for (const minion of notChargingBase.sort(
      (a, b) =>
        Point.getDistance(a.position, gameState.homeStar.position) -
        Point.getDistance(b.position, gameState.homeStar.position)
    )) {
      const conduitIndex = conduits.findIndex(
        (c) =>
          Point.getDistance(minion.position, c.minion.position) <= ENERGIZE_RANGE && c.charges >= minion.entity.size
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
    // deliver energy to homebase
    minion.moveToPoint(this.deliveryPoint);
    minion.charge(gameState.homeBase);
  }

  public handleDeadMinion(_gameState: IGameState, minion: Minion): void {
    this.unassignMinion(minion);
  }
}
