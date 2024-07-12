import * as THREE from "three";

class Soldier {
    constructor(options) {
        this.name = options.name;
        this.animations = {};
        this.object = options.object;
        this.waypoints = options.waypoints;
        this.speed = options.speed;
        this.app = options.app;

        if (options.app.pathfinder) {
            this.pathfinder = options.app.pathfinder;
            this.ZONE = options.zone;
            this.navMeshGroup = this.pathfinder.getGroup(this.ZONE, this.object.position);
        }

        const point = this.object.position.clone();
        point.z += 10;
        this.object.lookAt(point);

        if (options.animations) {
            this.mixer = new THREE.AnimationMixer(options.object);
            options.animations.forEach(animation => {
                this.animations[animation.name.toLowerCase()] = animation;
            });
        }

        this.app.scene.add(options.object);
    }

    get randomWaypoint() {
        const index = Math.floor(Math.random() * this.app.waypoints.length);
        return this.app.waypoints[index];
    }

    setTargetDirection(point) {
        const player = this.object;
        point.y = player.position.y;
        const quaternion = player.quaternion.clone();
        player.lookAt(point);
        this.quaternion = player.quaternion.clone();
        player.quaternion.copy(quaternion);
    }

    newPath(point) {
        const player = this.object;

        if (this.pathfinder === undefined) {
            this.calculatedPath = [point.clone()];
            this.setTargetDirection(point.clone());
            this.action = "walking";
            return;
        }

        const targetGroup = this.pathfinder.getGroup(this.ZONE, point);
        const closestTargetNode = this.pathfinder.getClosestNode(point, this.ZONE, targetGroup);

        this.calculatedPath = this.pathfinder.findPath(player.position, point, this.ZONE, this.navMeshGroup);

        if (this.calculatedPath && this.calculatedPath.length) {
            this.action = "walking";
            this.setTargetDirection(this.calculatedPath[0].clone());
        } else {
            this.action = "idle";

            if (this.pathfinder) {
                const closestPlayerNode = this.pathfinder.getClosestNode(player.position, this.ZONE, this.navMeshGroup);
                const clamped = new THREE.Vector3();
                this.pathfinder.clampStep(
                    player.position,
                    point.clone(),
                    closestPlayerNode,
                    this.ZONE,
                    this.navMeshGroup,
                    clamped
                );
            }
        }
    }

    set action(name) {
        if (this.actionName === name.toLowerCase()) return;

        const clip = this.animations[name.toLowerCase()];
        if (clip !== undefined) {
            const action = this.mixer.clipAction(clip);
            if (name === 'shot') {
                action.clampWhenFinished = true;
                action.setLoop(THREE.LoopOnce);
                delete this.calculatedPath;
            }

            action.reset();

            const nofade = this.actionName === 'shot';

            this.actionName = name.toLowerCase();

            action.play();

            if (this.curAction) {
                if (nofade) {
                    this.curAction.enabled = false;
                } else {
                    this.curAction.crossFadeTo(action, 0.5);
                }
            }

            this.curAction = action;
        }
    }

    get position() {
        return this.object.position;
    }

    update(dt) {
        const player = this.object;

        if (this.mixer) {
            this.mixer.update(dt);

            if (this.calculatedPath && this.calculatedPath.length) {
                const targetPosition = this.calculatedPath[0];
                const vel = targetPosition.clone().sub(player.position);

                let pathLegComplete = (vel.lengthSq() < 0.01);

                if (!pathLegComplete) {
                    const prevDistanceSq = player.position.distanceToSquared(targetPosition);
                    vel.normalize();

                    if (this.quaternion) {
                        player.quaternion.slerp(this.quaternion, 0.1);
                        player.position.add(vel.multiplyScalar(dt * this.speed));
                    }

                    const newDistanceSq = player.position.distanceToSquared(targetPosition);
                    pathLegComplete = (newDistanceSq > prevDistanceSq);
                }

                if (pathLegComplete) {
                    this.calculatedPath.shift();

                    if (this.calculatedPath.length == 0) {
                        if (this.waypoints !== undefined) {
                            this.newPath(this.randomWaypoint);
                        } else {
                            player.position.copy(targetPosition);
                            this.action = "idle";
                        }
                    } else {
                        this.setTargetDirection(this.calculatedPath[0].clone());
                    }
                }
            }
        }
    }
}

export { Soldier };
