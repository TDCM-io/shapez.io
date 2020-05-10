import { Loader } from "../../core/loader";
import { enumDirection, Vector, enumAngleToDirection, enumDirectionToVector } from "../../core/vector";
import { ItemAcceptorComponent } from "../components/item_acceptor";
import { ItemEjectorComponent } from "../components/item_ejector";
import { enumUndergroundBeltMode, UndergroundBeltComponent } from "../components/underground_belt";
import { Entity } from "../entity";
import { MetaBuilding } from "../meta_building";
import { GameRoot } from "../root";
import { globalConfig } from "../../core/config";
import { enumHubGoalRewards } from "../tutorial_goals";

/** @enum {string} */
export const arrayUndergroundRotationVariantToMode = [
    enumUndergroundBeltMode.sender,
    enumUndergroundBeltMode.receiver,
];

export class MetaUndergroundBeltBuilding extends MetaBuilding {
    constructor() {
        super("underground_belt");
    }

    getName() {
        return "Tunnel";
    }

    getSilhouetteColor() {
        return "#555";
    }

    getDescription() {
        return "Allows to tunnel resources under buildings and belts.";
    }

    getFlipOrientationAfterPlacement() {
        return true;
    }

    getStayInPlacementMode() {
        return true;
    }

    getPreviewSprite(rotationVariant) {
        switch (arrayUndergroundRotationVariantToMode[rotationVariant]) {
            case enumUndergroundBeltMode.sender:
                return Loader.getSprite("sprites/buildings/underground_belt_entry.png");
            case enumUndergroundBeltMode.receiver:
                return Loader.getSprite("sprites/buildings/underground_belt_exit.png");
            default:
                assertAlways(false, "Invalid rotation variant");
        }
    }

    getBlueprintSprite(rotationVariant) {
        switch (arrayUndergroundRotationVariantToMode[rotationVariant]) {
            case enumUndergroundBeltMode.sender:
                return Loader.getSprite("sprites/blueprints/underground_belt_entry.png");
            case enumUndergroundBeltMode.receiver:
                return Loader.getSprite("sprites/blueprints/underground_belt_exit.png");
            default:
                assertAlways(false, "Invalid rotation variant");
        }
    }

    /**
     * @param {GameRoot} root
     */
    getIsUnlocked(root) {
        return root.hubGoals.isRewardUnlocked(enumHubGoalRewards.reward_tunnel);
    }

    /**
     * Creates the entity at the given location
     * @param {Entity} entity
     */
    setupEntityComponents(entity) {
        // Required, since the item processor needs this.
        entity.addComponent(
            new ItemEjectorComponent({
                slots: [],
            })
        );

        entity.addComponent(new UndergroundBeltComponent({}));
        entity.addComponent(
            new ItemAcceptorComponent({
                slots: [],
            })
        );
    }

    /**
     * @param {GameRoot} root
     * @param {Vector} tile
     * @param {number} rotation
     * @return {{ rotation: number, rotationVariant: number, connectedEntities?: Array<Entity> }}
     */
    computeOptimalDirectionAndRotationVariantAtTile(root, tile, rotation) {
        const searchDirection = enumAngleToDirection[rotation];
        const searchVector = enumDirectionToVector[searchDirection];

        const targetRotation = (rotation + 180) % 360;

        for (let searchOffset = 1; searchOffset <= globalConfig.undergroundBeltMaxTiles; ++searchOffset) {
            tile = tile.addScalars(searchVector.x, searchVector.y);

            const contents = root.map.getTileContent(tile);
            if (contents) {
                const undergroundComp = contents.components.UndergroundBelt;
                if (undergroundComp) {
                    const staticComp = contents.components.StaticMapEntity;
                    if (staticComp.rotationDegrees === targetRotation) {
                        if (undergroundComp.mode !== enumUndergroundBeltMode.sender) {
                            // If we encounter an underground receiver on our way which is also faced in our direction, we don't accept that
                            break;
                        }
                        // console.log("GOT IT! rotation is", rotation, "and target is", staticComp.rotationDegrees);

                        return {
                            rotation: targetRotation,
                            rotationVariant: 1,
                            connectedEntities: [contents],
                        };
                    }
                }
            }
        }

        return {
            rotation,
            rotationVariant: 0,
        };
    }

    /**
     * @param {Entity} entity
     * @param {number} rotationVariant
     */
    updateRotationVariant(entity, rotationVariant) {
        entity.components.StaticMapEntity.spriteKey = this.getPreviewSprite(rotationVariant).spriteName;

        switch (arrayUndergroundRotationVariantToMode[rotationVariant]) {
            case enumUndergroundBeltMode.sender: {
                entity.components.UndergroundBelt.mode = enumUndergroundBeltMode.sender;
                entity.components.ItemEjector.setSlots([]);
                entity.components.ItemAcceptor.setSlots([
                    {
                        pos: new Vector(0, 0),
                        directions: [enumDirection.bottom],
                    },
                ]);
                return;
            }
            case enumUndergroundBeltMode.receiver: {
                entity.components.UndergroundBelt.mode = enumUndergroundBeltMode.receiver;
                entity.components.ItemAcceptor.setSlots([]);
                entity.components.ItemEjector.setSlots([
                    {
                        pos: new Vector(0, 0),
                        direction: enumDirection.top,
                    },
                ]);
                return;
            }
            default:
                assertAlways(false, "Invalid rotation variant");
        }
    }
}
