// コーラすごろく / Web移植 Step 2
// 目的:データと静止画面を移植し、3つのゾーンをブラウザ上で確認する。
// この段階では王冠・コマ・材料はまだ操作できません。

let CONFIG;
let TEXT;
let INGREDIENTS;
let EVENT_DIE;
let RESULT_WORDS;
let BOARD_NODES;
let gameState;
let layout;
let lastLayoutWidth = 0;
let lastLayoutHeight = 0;

function setup() {
    rectMode(CORNER);
    ellipseMode(CENTER);
    textAlign(CENTER);

    const workLabel =
        typeof document !== "undefined"
            ? document.getElementById(
                "workLabel"
            )
            : null;

    if (workLabel) {
        workLabel.style.display =
            "none";
    }

    initGameData();
    initCapPowerConfig();
    initGameState();
    updateLayout(true);
}



function resized() {
  updateLayout(true);
}

function draw() {
    updateLayout(false);
    background(25, 20, 20);

    if (gameState.phase === "TITLE") {
        drawTitle();
        return;
    }

    updateCarbonationParticles();

    if (gameState.phase === "RESULT") {
        drawResultScreen();
        return;
    }

    if (
        gameState.phase ===
        "WAIT_CAP_POWER"
    ) {
        updateCapPower();
    } else if (
        gameState.phase ===
        "CAP_SLIDING"
    ) {
        updateCapSlide();
    } else if (
        gameState.phase ===
        "CAP_PHYSICS"
    ) {
        updateCrownPhysics();
    }

    if (
        gameState.phase ===
        "WAIT_BRANCH_PREVIEW"
    ) {
        updateBranchGauge();
    }

    updateBoardCamera();
    drawPreviewScreen();
}








function touched(touch) {
    if (touch.state !== ENDED) {
        return;
    }

    const languageButton =
        getLanguageButtonRect();

    if (
        touch.x >=
            languageButton.x &&
        touch.x <=
            languageButton.x +
            languageButton.w &&
        touch.y >=
            languageButton.y &&
        touch.y <=
            languageButton.y +
            languageButton.h
    ) {
        gameState.language =
            gameState.language === "ja"
                ? "en"
                : "ja";

        return;
    }

    if (gameState.phase === "RESULT") {
        const button =
            getResultRestartButtonRect();

        if (
            touch.x >= button.x &&
            touch.x <= button.x + button.w &&
            touch.y >= button.y &&
            touch.y <= button.y + button.h
        ) {
            restartGame();
        }

        return;
    }

    if (gameState.phase === "TITLE") {
        gameState.phase =
            "WAIT_CAP_POWER";

        return;
    }

    if (
        gameState.phase ===
        "WAIT_EVENT_ROLL"
    ) {
        rollEventDice();
        return;
    }

    if (
        gameState.phase ===
            "WAIT_BRANCH_PREVIEW" &&
        pointInsidePanel(
            touch.x,
            touch.y,
            layout.cap
        )
    ) {
        confirmBranchChoice();
        return;
    }

    if (
        gameState.phase ===
            "WAIT_CAP_POWER" &&
        pointInsidePanel(
            touch.x,
            touch.y,
            layout.cap
        )
    ) {
        lockCapPower(
            touch.x
        );
    }
}






function pointInsidePanel(x, y, panel) {
    return (
        x >= panel.x &&
        x <= panel.x + panel.w &&
        y >= panel.y &&
        y <= panel.y + panel.h
    );
}

function getLanguageButtonRect() {
    const width = 50;
    const height = 30;
    const margin = 18;

    const resultOffset =
        gameState.phase === "RESULT"
            ? 48
            : 0;

    return {
        x:
            WIDTH -
            margin -
            width,

        y:
            HEIGHT -
            margin -
            height -
            resultOffset,

        w: width,
        h: height,
    };
}


function updateCapPower() {
    const cap = gameState.cap;

    cap.power +=
        cap.powerDirection *
        CONFIG.capGaugeSpeed *
        DeltaTime;

    if (cap.power >= 1) {
        cap.power = 1;
        cap.powerDirection = -1;
    } else if (cap.power <= 0) {
        cap.power = 0;
        cap.powerDirection = 1;
    }
}

function updateCapSlide() {
    const cap =
        gameState.cap;

    const slide =
        gameState.capSlide;

    if (!slide) {
        finishCapPowerSlide();
        return;
    }

    const dt =
        Math.min(
            0.05,
            Math.max(
                0,
                DeltaTime
            )
        );

    slide.elapsed +=
        dt;

    const progress =
        Math.min(
            1,
            slide.elapsed /
                slide.duration
        );

    cap.power +=
        slide.velocity *
        dt;

    const wobbleStrength =
        CAP_SLIDE_CONFIG.wobbleAmplitude *
        (
            1 -
            progress
        );

    cap.power +=
        Math.sin(
            slide.elapsed *
                CAP_SLIDE_CONFIG.wobbleFrequency +
            slide.phase
        ) *
        wobbleStrength *
        dt *
        8;

    if (cap.power >= 1) {
        cap.power = 1;

        slide.velocity =
            -Math.abs(
                slide.velocity
            ) *
            CAP_SLIDE_CONFIG.boundaryBounce;

        cap.powerDirection =
            -1;
    } else if (
        cap.power <= 0
    ) {
        cap.power = 0;

        slide.velocity =
            Math.abs(
                slide.velocity
            ) *
            CAP_SLIDE_CONFIG.boundaryBounce;

        cap.powerDirection =
            1;
    } else if (
        Math.abs(
            slide.velocity
        ) >
        0.001
    ) {
        cap.powerDirection =
            slide.velocity >= 0
                ? 1
                : -1;
    }

    slide.velocity *=
        Math.pow(
            CAP_SLIDE_CONFIG.friction,
            dt * 60
        );

    if (
        progress >= 1 ||
        Math.abs(
            slide.velocity
        ) <=
            CAP_SLIDE_CONFIG.minVelocity
    ) {
        const jitter =
            (
                Math.random() *
                2 -
                1
            ) *
            CAP_SLIDE_CONFIG.finalJitter;

        cap.power =
            Math.max(
                0,
                Math.min(
                    1,
                    cap.power +
                        jitter
                )
            );

        gameState.capSlide =
            null;

        finishCapPowerSlide();
    }
}

function updateCrownPhysics() {
    const physics =
        gameState.crownPhysics;

    const cap =
        gameState.cap;

    if (
        !physics ||
        !physics.active
    ) {
        return;
    }

    const panel =
        layout.cap;

    const board =
        getCrownPhysicsLayout(
            panel
        );

    const frameTime =
        Math.min(
            0.045,
            Math.max(
                0,
                DeltaTime
            )
        );

    physics.elapsed +=
        frameTime;

    physics.trailTimer +=
        frameTime;

    physics.wallFlash =
        Math.max(
            0,
            physics.wallFlash -
                frameTime *
                CROWN_PHYSICS_CONFIG.wallFlashFade
        );

    physics.impactFlash =
        Math.max(
            0,
            physics.impactFlash -
                frameTime *
                CROWN_PHYSICS_CONFIG.wallRingFade
        );

    const substeps =
        CROWN_PHYSICS_CONFIG.substeps;

    const stepTime =
        frameTime /
        substeps;

    for (
        let step = 0;
        step < substeps;
        step += 1
    ) {
        cap.x +=
            physics.vx *
            stepTime;

        cap.y +=
            physics.vy *
            stepTime;

        cap.rotation +=
            physics.spin *
            stepTime;

        const dx =
            cap.x -
            board.centerX;

        const dy =
            cap.y -
            board.centerY;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        if (
            distance >
            board.maxDistance
        ) {
            const normalX =
                distance > 0
                    ? dx / distance
                    : 0;

            const normalY =
                distance > 0
                    ? dy / distance
                    : 1;

            cap.x =
                board.centerX +
                normalX *
                    board.maxDistance;

            cap.y =
                board.centerY +
                normalY *
                    board.maxDistance;

            const outwardSpeed =
                physics.vx *
                    normalX +
                physics.vy *
                    normalY;

            const impactStrength =
                Math.min(
                    1,
                    Math.abs(
                        outwardSpeed
                    ) /
                    (
                        board.radius *
                        1.65
                    )
                );

            physics.impactX =
                cap.x;

            physics.impactY =
                cap.y;

            physics.impactNormalX =
                normalX;

            physics.impactNormalY =
                normalY;

            physics.impactStrength =
                impactStrength;

            physics.impactFlash =
                1;

            physics.wallFlash =
                1;

            if (
                outwardSpeed > 0
            ) {
                physics.vx -=
                    (
                        1 +
                        CROWN_PHYSICS_CONFIG.wallBounce
                    ) *
                    outwardSpeed *
                    normalX;

                physics.vy -=
                    (
                        1 +
                        CROWN_PHYSICS_CONFIG.wallBounce
                    ) *
                    outwardSpeed *
                    normalY;
            }

            const tangentX =
                -normalY;

            const tangentY =
                normalX;

            const tangentKick =
                (
                    Math.random() *
                    2 -
                    1
                ) *
                board.radius *
                (
                    0.025 +
                    impactStrength *
                        0.075
                );

            physics.vx +=
                tangentX *
                tangentKick;

            physics.vy +=
                tangentY *
                tangentKick;

            physics.spin *=
                -CROWN_PHYSICS_CONFIG.wallSpinLoss;

            physics.spin +=
                tangentKick *
                3.2;

            physics.collisionCount +=
                1;
        }

        const friction =
            Math.pow(
                CROWN_PHYSICS_CONFIG.friction,
                stepTime * 60
            );

        physics.vx *=
            friction;

        physics.vy *=
            friction;

        physics.spin *=
            Math.pow(
                0.982,
                stepTime * 60
            );
    }

    const speed =
        Math.sqrt(
            physics.vx *
                physics.vx +
            physics.vy *
                physics.vy
        );

    if (
        physics.trailTimer >=
            CROWN_PHYSICS_CONFIG.trailInterval &&
        speed >=
            board.radius *
            CROWN_PHYSICS_CONFIG.trailMinSpeedRatio
    ) {
        physics.trailTimer =
            0;

        physics.trail.push(
            {
                x: cap.x,
                y: cap.y,
                rotation:
                    cap.rotation,
                speed:
                    Math.min(
                        1,
                        speed /
                            (
                                board.radius *
                                2
                            )
                    ),
            }
        );

        while (
            physics.trail.length >
            CROWN_PHYSICS_CONFIG.trailLength
        ) {
            physics.trail.shift();
        }
    }

    const stopSpeed =
        board.radius *
        CROWN_PHYSICS_CONFIG.stopSpeedRatio;

    if (
        (
            physics.elapsed >=
                CROWN_PHYSICS_CONFIG.minimumDuration &&
            speed <=
                stopSpeed
        ) ||
        physics.elapsed >=
            CROWN_PHYSICS_CONFIG.maximumDuration
    ) {
        finishCrownPhysics();
    }
}


function finishCrownPhysics() {
    const physics =
        gameState.crownPhysics;

    const cap =
        gameState.cap;

    if (!physics) {
        return;
    }

    physics.active =
        false;

    physics.vx =
        0;

    physics.vy =
        0;

    physics.impactFlash =
        0;

    const board =
        getCrownPhysicsLayout(
            layout.cap
        );

    const dx =
        cap.x -
        board.centerX;

    const dy =
        cap.y -
        board.centerY;

    const distance =
        Math.sqrt(
            dx * dx +
            dy * dy
        );

    const stopRatio =
        Math.min(
            1,
            distance /
                board.maxDistance
        );

    const result =
        resolveCrownStopDistance(
            stopRatio
        );

    const branchIndex =
        resolveCrownBranchIndex(
            cap.x,
            board.centerX
        );

    cap.distance =
        result.distance;

    cap.isOverPower =
        cap.lockedPower >=
        CONFIG.capOverStart;

    gameState.rollBranchIndex =
        branchIndex;

    gameState.rollBranchDirection =
        branchIndex === 0
            ? "left"
            : "right";

    gameState.branch.selectedIndex =
        branchIndex;

    gameState.branch.locked =
        true;

    physics.resultValue =
        cap.distance;

    physics.branchIndex =
        branchIndex;

    physics.stopRatio =
        stopRatio;

    physics.resultPulse =
        1;

    physics.stopFlash =
        1;

    physics.stopRing =
        0;

    const settleRotation =
        Math.round(
            cap.rotation /
            30
        ) *
        30;

    tween(
        CROWN_PHYSICS_CONFIG.settleDuration,
        cap,
        {
            rotation:
                settleRotation,
        },
        tween.easing.bounceOut
    );

    tween(
        CROWN_PHYSICS_CONFIG.stopRingDuration,
        physics,
        {
            stopFlash: 0,
            stopRing: 1,
        },
        tween.easing.quadOut
    );

    tween(
        CROWN_PHYSICS_CONFIG.trailFadeDuration,
        physics,
        {
            trailAlpha: 0,
        },
        tween.easing.quadOut
    );

    gameState.phase =
        "CAP_POWER_RESULT";

    const timer = {
        value: 0,
    };

    tween(
        CROWN_PHYSICS_CONFIG.resultHoldDuration,
        timer,
        {
            value: 1,
        },
        tween.easing.linear,
        function() {
            startMoveCounterTransfer();
        }
    );
}






function updateBranchGauge() {
    const branch = gameState.branch;

    branch.power +=
        branch.powerDirection *
        CONFIG.branchGaugeSpeed *
        DeltaTime;

    if (branch.power >= 1) {
        branch.power = 1;
        branch.powerDirection = -1;
    } else if (branch.power <= 0) {
        branch.power = 0;
        branch.powerDirection = 1;
    }

    branch.selectedIndex =
        branch.power < 0.5
            ? 0
            : 1;
}

function startBranchChoice(node) {
    if (
        !node ||
        !node.choices ||
        node.choices.length < 2
    ) {
        finishMovement();
        return;
    }

    gameState.branch.activeNodeId =
        node.id;

    gameState.branch.power = 0.5;
    gameState.branch.powerDirection =
        Math.random() < 0.5
            ? -1
            : 1;

    gameState.branch.selectedIndex = 1;
    gameState.branch.locked = false;

    gameState.phase =
        "WAIT_BRANCH_PREVIEW";

    gameState.landingPulse = 1;
}

function getCurrentBranchChoiceIndex() {
    const branch =
        gameState.branch;

    if (branch.locked) {
        return branch.selectedIndex;
    }

    return branch.power < 0.5
        ? 0
        : 1;
}

function confirmBranchChoice() {
    const branch =
        gameState.branch;

    const node =
        BOARD_NODES[
            branch.activeNodeId
        ];

    if (
        !node ||
        !node.choices ||
        node.choices.length < 2
    ) {
        gameState.phase =
            "WAIT_CAP_POWER";

        return;
    }

    branch.selectedIndex =
        getCurrentBranchChoiceIndex();

    branch.locked = true;

    const choice =
        node.choices[
            branch.selectedIndex
        ];

    gameState.selectedRoutes[
        node.id
    ] = choice.id;

    gameState.phase =
        "BRANCH_LOCKED";

    const timer = {
        value: 0,
    };

    tween(
        CONFIG.branchLockDuration,
        timer,
        {
            value: 1,
        },
        tween.easing.linear,
        function() {
            moveOneStep();
        }
    );
}





function updateBoardCamera() {
    const currentNode =
        BOARD_NODES[gameState.currentNodeId];

    if (!currentNode) {
        return;
    }

    let targetWorldX =
        currentNode.nx * CONFIG.mapWidth;

    let targetWorldY =
        currentNode.ny * CONFIG.mapHeight +
        CONFIG.cameraLookAheadY;

    if (
        gameState.targetNodeId &&
        gameState.moveAnimation
    ) {
        const targetNode =
            BOARD_NODES[gameState.targetNodeId];

        if (targetNode) {
            const progress =
                gameState.moveAnimation.progress;

            const currentWorldX =
                currentNode.nx * CONFIG.mapWidth;

            const currentWorldY =
                currentNode.ny * CONFIG.mapHeight;

            const nextWorldX =
                targetNode.nx * CONFIG.mapWidth;

            const nextWorldY =
                targetNode.ny * CONFIG.mapHeight;

            targetWorldX =
                currentWorldX +
                (nextWorldX - currentWorldX) *
                    progress;

            targetWorldY =
                currentWorldY +
                (nextWorldY - currentWorldY) *
                    progress +
                CONFIG.cameraLookAheadY;
        }
    }

    const follow =
        Math.min(
            1,
            DeltaTime * 7
        );

    gameState.camera.x +=
        (targetWorldX - gameState.camera.x) *
        follow;

    gameState.camera.y +=
        (targetWorldY - gameState.camera.y) *
        follow;

    if (gameState.landingPulse > 0) {
        gameState.landingPulse -=
            DeltaTime * 4.5;

        if (gameState.landingPulse < 0) {
            gameState.landingPulse = 0;
        }
    }
}


function resolveCapDistance(power) {
    let weights;
    let zone;
    let isOverPower = false;

    if (
        power <
        CONFIG.capPowerZone1End
    ) {
        zone = "low";
        weights = [
            0.70,
            0.25,
            0.05,
        ];
    } else if (
        power <
        CONFIG.capPowerZone2End
    ) {
        zone = "mid";
        weights = [
            0.20,
            0.60,
            0.20,
        ];
    } else if (
        power <
        CONFIG.capPowerZone3End
    ) {
        zone = "high";
        weights = [
            0.05,
            0.25,
            0.70,
        ];
    } else {
        zone = "danger";
        isOverPower = true;
        weights = [
            0.20,
            0.20,
            0.60,
        ];
    }

    const randomValue =
        Math.random();

    let distance = 3;

    if (
        randomValue <
        weights[0]
    ) {
        distance = 1;
    } else if (
        randomValue <
        weights[0] +
            weights[1]
    ) {
        distance = 2;
    }

    return {
        distance: distance,
        isOverPower: isOverPower,
        zone: zone,
        weights: weights,
    };
}

function resolveCrownStopDistance(
    stopRatio
) {
    if (
        stopRatio <=
        CROWN_PHYSICS_CONFIG.centerZoneEnd
    ) {
        return {
            distance: 3,
            zone: "center",
        };
    }

    if (
        stopRatio <=
        CROWN_PHYSICS_CONFIG.outerZoneEnd
    ) {
        return {
            distance: 2,
            zone: "middle",
        };
    }

    return {
        distance: 1,
        zone: "outer",
    };
}

function resolveCrownBranchIndex(
    capX,
    centerX
) {
    return capX < centerX
        ? 0
        : 1;
}

function getPendingBranchWithinSteps(
    maxSteps
) {
    let node =
        BOARD_NODES[
            gameState.currentNodeId
        ];

    let steps = 0;

    const visited = {};

    while (
        node &&
        steps <= maxSteps
    ) {
        if (
            node.choices &&
            node.choices.length >= 2 &&
            !gameState.selectedRoutes[
                node.id
            ]
        ) {
            return node;
        }

        let nextNodeId =
            node.next;

        if (
            node.choices &&
            node.choices.length > 0
        ) {
            const selectedChoiceId =
                gameState.selectedRoutes[
                    node.id
                ];

            let selectedChoice =
                null;

            for (
                const choice of
                node.choices
            ) {
                if (
                    choice.id ===
                    selectedChoiceId
                ) {
                    selectedChoice =
                        choice;

                    break;
                }
            }

            if (!selectedChoice) {
                return null;
            }

            nextNodeId =
                selectedChoice.next;
        }

        if (
            !nextNodeId ||
            visited[nextNodeId]
        ) {
            break;
        }

        visited[node.id] =
            true;

        node =
            BOARD_NODES[
                nextNodeId
            ];

        steps += 1;
    }

    return null;
}

function isCrownBranchRelevant(
    resultVisible
) {
    const maxSteps =
        resultVisible
            ? Math.max(
                0,
                gameState.cap.distance
            )
            : 3;

    return (
        getPendingBranchWithinSteps(
            maxSteps
        ) !== null
    );
}






function lockCapPower(
    touchX
) {
    const cap =
        gameState.cap;

    const panel =
        layout.cap;

    const normalizedX =
        Math.max(
            0,
            Math.min(
                1,
                (
                    touchX -
                    panel.x
                ) /
                panel.w
            )
        );

    let aimValue =
        (
            normalizedX -
            0.5
        ) *
        2;

    const absoluteAim =
        Math.abs(
            aimValue
        );

    if (
        absoluteAim <=
        CROWN_PHYSICS_CONFIG.aimDeadZone
    ) {
        aimValue =
            0;
    } else {
        const aimSign =
            aimValue < 0
                ? -1
                : 1;

        aimValue =
            aimSign *
            (
                absoluteAim -
                CROWN_PHYSICS_CONFIG.aimDeadZone
            ) /
            (
                1 -
                CROWN_PHYSICS_CONFIG.aimDeadZone
            );
    }

    gameState.crownAim = {
        value:
            Math.max(
                -1,
                Math.min(
                    1,
                    aimValue
                )
            ),

        normalizedX:
            normalizedX,

        lockedAt:
            ElapsedTime,
    };

    const direction =
        cap.powerDirection >= 0
            ? 1
            : -1;

    const speedRatio =
        CAP_SLIDE_CONFIG.minSpeedRatio +
        Math.random() *
        (
            CAP_SLIDE_CONFIG.maxSpeedRatio -
            CAP_SLIDE_CONFIG.minSpeedRatio
        );

    gameState.capSlide = {
        elapsed: 0,

        duration:
            CAP_SLIDE_CONFIG.minDuration +
            Math.random() *
            (
                CAP_SLIDE_CONFIG.maxDuration -
                CAP_SLIDE_CONFIG.minDuration
            ),

        velocity:
            direction *
            CONFIG.capGaugeSpeed *
            speedRatio,

        phase:
            Math.random() *
            Math.PI *
            2,
    };

    cap.lockedPower =
        cap.power;

    gameState.phase =
        "CAP_SLIDING";
}


function finishCapPowerSlide() {
    const cap =
        gameState.cap;

    const panel =
        layout.cap;

    cap.lockedPower =
        cap.power;

    const board =
        getCrownPhysicsLayout(
            panel
        );

    const aimValue =
        gameState.crownAim
            ? gameState.crownAim.value
            : 0;

    cap.distance =
        1;

    cap.isOverPower =
        cap.lockedPower >=
        CONFIG.capOverStart;

    cap.x =
        board.centerX;

    cap.y =
        board.launchY;

    cap.rotation =
        aimValue * 10;

    gameState.capRoll =
        null;

    gameState.crownPhysics = {
        active: false,
        elapsed: 0,
        vx: 0,
        vy: 0,
        spin: 0,
        collisionCount: 0,
        wallFlash: 0,
        impactFlash: 0,
        impactStrength: 0,
        impactX:
            board.centerX,
        impactY:
            board.launchY,
        impactNormalX: 0,
        impactNormalY: -1,
        resultValue: null,
        stopRatio: 1,
        stopFlash: 0,
        stopRing: 0,
        trail: [],
        trailTimer: 0,
        trailAlpha: 1,
        aimValue:
            aimValue,
        launchDirectionRatio:
            0,
    };

    gameState.capSnapEffect = {
        visible: true,
        ring: 0,
        spark: 0,
        alpha: 255,
    };

    gameState.phase =
        "CAP_PHYSICS";

    tween(
        CAP_SNAP_CONFIG.pressDuration,
        gameState.capSnapEffect,
        {
            ring: 0.16,
            spark: 0.12,
        },
        tween.easing.quadOut
    );

    tween(
        CAP_SNAP_CONFIG.pressDuration,
        cap,
        {
            y:
                board.launchY -
                CAP_SNAP_CONFIG.pullbackDistance,

            rotation:
                aimValue * 10 -
                11,
        },
        tween.easing.quadOut,
        function() {
            tween(
                CAP_SNAP_CONFIG.releaseDuration,
                gameState.capSnapEffect,
                {
                    ring: 1,
                    spark: 1,
                    alpha: 0,
                },
                tween.easing.quadOut
            );

            tween(
                CAP_SNAP_CONFIG.releaseDuration,
                cap,
                {
                    y:
                        board.launchY +
                        CAP_SNAP_CONFIG.releaseKick,

                    rotation:
                        aimValue * 10 +
                        14,
                },
                tween.easing.bounceOut,
                function() {
                    if (
                        gameState.capSnapEffect
                    ) {
                        gameState.capSnapEffect.visible =
                            false;
                    }

                    const power =
                        cap.lockedPower;

                    let speedFactor =
                        0.35 +
                        power *
                            1.70;

                    if (
                        power > 0.82
                    ) {
                        speedFactor +=
                            (
                                power -
                                0.82
                            ) *
                            6;
                    }

                    const launchSpeed =
                        board.radius *
                        speedFactor;

                    const randomDirection =
                        (
                            Math.random() *
                            2 -
                            1
                        ) *
                        CROWN_PHYSICS_CONFIG.horizontalJitter;

                    let directionRatio =
                        aimValue *
                            CROWN_PHYSICS_CONFIG.aimInfluence +
                        randomDirection;

                    directionRatio =
                        Math.max(
                            -CROWN_PHYSICS_CONFIG.maxDirectionRatio,
                            Math.min(
                                CROWN_PHYSICS_CONFIG.maxDirectionRatio,
                                directionRatio
                            )
                        );

                    const horizontalSpeed =
                        launchSpeed *
                        directionRatio;

                    const verticalSpeed =
                        launchSpeed *
                        Math.sqrt(
                            Math.max(
                                0,
                                1 -
                                    directionRatio *
                                    directionRatio
                            )
                        );

                    gameState.crownPhysics.vx =
                        horizontalSpeed;

                    gameState.crownPhysics.vy =
                        verticalSpeed;

                    gameState.crownPhysics.launchDirectionRatio =
                        directionRatio;

                    gameState.crownPhysics.spin =
                        (
                            horizontalSpeed >= 0
                                ? -1
                                : 1
                        ) *
                        (
                            420 +
                            power *
                                540
                        );

                    gameState.crownPhysics.elapsed =
                        0;

                    gameState.crownPhysics.active =
                        true;
                }
            );
        }
    );
}







function launchCapAfterSnap(
    finalY,
    laneTop,
    targetX,
    panel,
    showResult
) {
    const cap =
        gameState.cap;

    if (cap.isOverPower) {
        const overY =
            laneTop +
            Math.min(
                38,
                panel.h * 0.12
            );

        tween(
            CONFIG.capFlightDuration,
            cap,
            {
                x: targetX,
                y: overY,
                rotation:
                    CONFIG.capRotationSpeed *
                    2,
            },
            tween.easing.quadOut,
            function() {
                tween(
                    CONFIG.capBounceDuration,
                    cap,
                    {
                        y: finalY,
                        rotation:
                            CONFIG.capRotationSpeed *
                            2.6,
                    },
                    tween.easing.bounceOut,
                    showResult
                );
            }
        );

        return;
    }

    const landingOvershoot =
        finalY +
        Math.min(
            10,
            panel.h * 0.035
        );

    tween(
        CONFIG.capFlightDuration,
        cap,
        {
            x: targetX,
            y: landingOvershoot,
            rotation:
                CONFIG.capRotationSpeed *
                2,
        },
        tween.easing.quadOut,
        function() {
            tween(
                CONFIG.capBounceDuration,
                cap,
                {
                    y: finalY,
                    rotation:
                        CONFIG.capRotationSpeed *
                        2.35,
                },
                tween.easing.bounceOut,
                showResult
            );
        }
    );
}



function startMoveCounterTransfer() {
    const counter =
        gameState.moveCounter;

    const cap =
        gameState.cap;

    counter.visible =
        true;

    counter.displayValue =
        cap.distance;

    counter.alpha =
        255;

    counter.scale =
        1.08;

    counter.x =
        layout.cap.x +
        cap.x;

    counter.y =
        layout.cap.y +
        cap.y;

    gameState.moveTotal =
        cap.distance;

    gameState.phase =
        "TRANSFERRING_MOVE_COUNT";

    const targetX =
        layout.cap.x +
        layout.cap.w * 0.80;

    const targetY =
        layout.board.y +
        38;

    tween(
        CONFIG.moveCounterTransferDuration,
        counter,
        {
            x: targetX,
            y: targetY,
            scale: 0.72,
        },
        tween.easing.quadInOut,
        function() {
            resetCapAfterResult();

            startBoardMovement(
                gameState.moveTotal
            );
        }
    );
}






function resetCapAfterResult() {
    const cap =
        gameState.cap;

    const panel =
        layout.cap;

    const gaugeLayout =
        getMainGaugeLayout(
            panel
        );

    gameState.capSlide =
        null;

    gameState.capRoll =
        null;

    gameState.crownPhysics =
        null;

    gameState.capSnapEffect =
        null;

    gameState.crownAim =
        null;

    cap.power =
        0;

    cap.powerDirection =
        1;

    cap.lockedPower =
        0;

    cap.distance =
        1;

    cap.isOverPower =
        false;

    cap.x =
        gaugeLayout.centerX;

    cap.y =
        gaugeLayout.centerY;

    cap.rotation =
        0;
}





function startBoardMovement(distance) {
    gameState.remainingSteps =
        distance;

    gameState.moveCounter.displayValue =
        distance;

    const timer = {
        value: 0,
    };

    tween(
        0.08,
        timer,
        {
            value: 1,
        },
        tween.easing.linear,
        function() {
            moveOneStep();
        }
    );
}

function moveOneStep() {
    const currentNode =
        BOARD_NODES[
            gameState.currentNodeId
        ];

    if (!currentNode) {
        finishMovement();
        return;
    }

    if (
        currentNode.id ===
        "goal"
    ) {
        gameState.remainingSteps =
            0;

        gameState.moveCounter.displayValue =
            0;

        finishMovement();
        return;
    }

    let nextNodeId =
        currentNode.next;

    if (
        currentNode.choices &&
        currentNode.choices.length > 0
    ) {
        let selectedChoiceId =
            gameState.selectedRoutes[
                currentNode.id
            ];

        if (!selectedChoiceId) {
            const rollBranchIndex =
                typeof gameState.rollBranchIndex ===
                "number"
                    ? gameState.rollBranchIndex
                    : 0;

            const choiceIndex =
                Math.max(
                    0,
                    Math.min(
                        currentNode.choices.length -
                            1,
                        rollBranchIndex
                    )
                );

            const automaticChoice =
                currentNode.choices[
                    choiceIndex
                ];

            if (!automaticChoice) {
                finishMovement();
                return;
            }

            selectedChoiceId =
                automaticChoice.id;

            gameState.selectedRoutes[
                currentNode.id
            ] =
                automaticChoice.id;

            gameState.branch.activeNodeId =
                currentNode.id;

            gameState.branch.selectedIndex =
                choiceIndex;

            gameState.branch.locked =
                true;

            gameState.landingPulse =
                1;
        }

        let selectedChoice =
            null;

        for (
            const choice of
            currentNode.choices
        ) {
            if (
                choice.id ===
                selectedChoiceId
            ) {
                selectedChoice =
                    choice;

                break;
            }
        }

        if (!selectedChoice) {
            const fallbackIndex =
                Math.max(
                    0,
                    Math.min(
                        currentNode.choices.length -
                            1,
                        typeof gameState.rollBranchIndex ===
                            "number"
                            ? gameState.rollBranchIndex
                            : 0
                    )
                );

            selectedChoice =
                currentNode.choices[
                    fallbackIndex
                ];

            if (!selectedChoice) {
                finishMovement();
                return;
            }

            gameState.selectedRoutes[
                currentNode.id
            ] =
                selectedChoice.id;

            gameState.branch.activeNodeId =
                currentNode.id;

            gameState.branch.selectedIndex =
                fallbackIndex;

            gameState.branch.locked =
                true;
        }

        nextNodeId =
            selectedChoice.next;
    }

    if (
        gameState.remainingSteps <=
        0
    ) {
        finishMovement();
        return;
    }

    if (!nextNodeId) {
        gameState.remainingSteps =
            0;

        gameState.moveCounter.displayValue =
            0;

        finishMovement();
        return;
    }

    const targetNode =
        BOARD_NODES[
            nextNodeId
        ];

    if (!targetNode) {
        gameState.remainingSteps =
            0;

        gameState.moveCounter.displayValue =
            0;

        finishMovement();
        return;
    }

    gameState.targetNodeId =
        targetNode.id;

    gameState.moveAnimation.progress =
        0;

    gameState.phase =
        "MOVING";

    tween(
        CONFIG.moveDuration,
        gameState.moveAnimation,
        {
            progress: 1,
        },
        tween.easing.quadInOut,
        function() {
            gameState.currentNodeId =
                targetNode.id;

            gameState.targetNodeId =
                null;

            gameState.moveAnimation.progress =
                0;

            gameState.remainingSteps =
                Math.max(
                    0,
                    gameState.remainingSteps -
                        1
                );

            const reachedGoal =
                targetNode.id ===
                "goal";

            animateMoveCounterDecrease(
                function() {
                    if (!reachedGoal) {
                        moveOneStep();
                        return;
                    }

                    if (
                        gameState.remainingSteps >
                        0
                    ) {
                        gameState.remainingSteps =
                            0;

                        animateMoveCounterDecrease(
                            function() {
                                finishMovement();
                            }
                        );

                        return;
                    }

                    finishMovement();
                }
            );
        }
    );
}




function animateMoveCounterDecrease(onComplete) {
    const counter =
        gameState.moveCounter;

    gameState.phase =
        "MOVE_COUNT_TICK";

    tween(
        CONFIG.moveCounterTickDuration,
        counter,
        {
            scale: 0.46,
        },
        tween.easing.quadIn,
        function() {
            counter.displayValue =
                gameState.remainingSteps;

            gameState.landingPulse = 1;

            tween(
                CONFIG.moveCounterTickDuration,
                counter,
                {
                    scale: 0.79,
                },
                tween.easing.bounceOut,
                function() {
                    tween(
                        CONFIG.moveCounterTickDuration,
                        counter,
                        {
                            scale: 0.72,
                        },
                        tween.easing.quadOut,
                        function() {
                            const timer = {
                                value: 0,
                            };

                            tween(
                                CONFIG.moveCounterStepPause,
                                timer,
                                {
                                    value: 1,
                                },
                                tween.easing.linear,
                                function() {
                                    if (onComplete) {
                                        onComplete();
                                    }
                                }
                            );
                        }
                    );
                }
            );
        }
    );
}

function finishMovement() {
    const counter =
        gameState.moveCounter;

    gameState.phase =
        "MOVE_COUNT_ZERO";

    counter.displayValue = 0;

    const holdTimer = {
        value: 0,
    };

    tween(
        CONFIG.moveCounterZeroHoldDuration,
        holdTimer,
        {
            value: 1,
        },
        tween.easing.linear,
        function() {
            tween(
                CONFIG.moveCounterFadeDuration,
                counter,
                {
                    scale: 0.12,
                    alpha: 0,
                },
                tween.easing.quadIn,
                function() {
                    counter.visible = false;
                    counter.scale = 0.72;
                    counter.alpha = 255;

                    gameState.phase = "LANDING";
                    gameState.landingPulse = 1;

                    const landingTimer = {
                        value: 0,
                    };

                    tween(
                        CONFIG.moveLandingHoldDuration,
                        landingTimer,
                        {
                            value: 1,
                        },
                        tween.easing.linear,
                        function() {
                            resolveLandingTile();
                        }
                    );
                }
            );
        }
    );
}

function resolveLandingTile() {
    const node =
        BOARD_NODES[
            gameState.currentNodeId
        ];

    if (!node) {
        gameState.phase =
            "WAIT_CAP_POWER";

        return;
    }

    if (node.id === "goal") {
        startGoalSequence();
        return;
    }

    if (
        node.nodeType ===
            "event_gate" &&
        !gameState.resolvedEvents[
            node.eventId
        ]
    ) {
        startEventGate(node);
        return;
    }

    if (
        node.effect &&
        node.effect.addMystery
    ) {
        startMysteryIngredient();
        return;
    }

    if (
        node.effect &&
        node.effect.addIngredient
    ) {
        startAddingIngredient(
            node.effect.addIngredient
        );

        return;
    }

    const finishEffect = function() {
        gameState.phase =
            "WAIT_CAP_POWER";
    };

    const applyPressure = function() {
        if (
            node.effect &&
            node.effect.pressureDelta
        ) {
            changePressure(
                node.effect.pressureDelta,
                finishEffect
            );

            return;
        }

        finishEffect();
    };

    if (
        node.effect &&
        node.effect.garnish
    ) {
        gameState.glass.garnish =
            node.effect.garnish;

        showGarnishReveal(
            node.effect.garnish,
            applyPressure
        );

        return;
    }

    applyPressure();
}

function startGoalSequence() {
    gameState.phase =
        "GOAL_ARRIVAL";

    gameState.remainingSteps = 0;
    gameState.moveCounter.visible = false;
    gameState.moveCounter.displayValue = 0;

    createResultData();

    const effect =
        gameState.goalEffect;

    effect.visible = true;
    effect.scale = 0.55;
    effect.alpha = 0;
    effect.ring = 0;

    tween(
        CONFIG.goalRevealDuration,
        effect,
        {
            scale: 1.12,
            alpha: 255,
            ring: 1,
        },
        tween.easing.bounceOut,
        function() {
            const holdTimer = {
                value: 0,
            };

            tween(
                CONFIG.goalHoldDuration,
                holdTimer,
                {
                    value: 1,
                },
                tween.easing.linear,
                function() {
                    tween(
                        CONFIG.goalFadeDuration,
                        effect,
                        {
                            scale: 1.32,
                            alpha: 0,
                            ring: 2,
                        },
                        tween.easing.quadIn,
                        function() {
                            effect.visible = false;
                            startResultScreen();
                        }
                    );
                }
            );
        }
    );
}

function createResultData() {
    const slots =
        gameState.glass.slots;

    let sweetness = 0;
    let spice = 0;
    let chill = 0;
    let strange = 0;
    let iceCount = 0;

    const strangeIds = [];
    const ingredientIds = [];
    const ingredientCounts = {};

    for (
        const token of slots
    ) {
        const ingredient =
            INGREDIENTS[
                token.ingredientId
            ];

        if (!ingredient) {
            continue;
        }

        sweetness +=
            ingredient.sweetness || 0;

        spice +=
            ingredient.spice || 0;

        chill +=
            ingredient.chill || 0;

        strange +=
            ingredient.strange || 0;

        if (
            ingredient.id ===
            "ice"
        ) {
            iceCount += 1;
        }

        ingredientIds.push(
            ingredient.id
        );

        ingredientCounts[
            ingredient.id
        ] =
            (
                ingredientCounts[
                    ingredient.id
                ] ||
                0
            ) +
            1;

        if (
            ingredient.strange > 0 &&
            strangeIds.indexOf(
                ingredient.id
            ) < 0
        ) {
            strangeIds.push(
                ingredient.id
            );
        }
    }

    const topToken =
        slots.length > 0
            ? slots[
                slots.length - 1
            ]
            : null;

    const routePrimary =
        gameState.selectedRoutes[
            "branch1"
        ] ||
        null;

    const routeFinal =
        gameState.selectedRoutes[
            "branch2"
        ] ||
        routePrimary;

    gameState.resultData = {
        topIngredientId:
            topToken
                ? topToken.ingredientId
                : null,

        ingredientIds:
            ingredientIds,

        ingredientCounts:
            ingredientCounts,

        sweetness:
            sweetness,

        spice:
            spice,

        chill:
            chill,

        strange:
            strange,

        iceCount:
            iceCount,

        sweetnessLevel:
            sweetness >= 3
                ? "high"
                : "low",

        carbonationLevel:
            gameState.glass.pressure >= 3
                ? "high"
                : "low",

        chillLevel:
            iceCount >= 2
                ? "high"
                : "low",

        pressure:
            gameState.glass.pressure,

        garnish:
            gameState.glass.garnish,

        spilledCount:
            gameState.glass.spilledTokens.length,

        burstCount:
            gameState.burstCount,

        stirCount:
            gameState.stirCount,

        mysteryCount:
            gameState.mysteryCount,

        glassFullCount:
            gameState.glassFullCount,

        routePrimary:
            routePrimary,

        routeFinal:
            routeFinal,

        strangeIngredientIds:
            strangeIds,
    };
}


function startResultScreen() {
    gameState.phase =
        "RESULT";

    gameState.resultReveal.scale =
        0.94;

    gameState.resultReveal.alpha =
        0;

    tween(
        CONFIG.resultRevealDuration,
        gameState.resultReveal,
        {
            scale: 1,
            alpha: 255,
        },
        tween.easing.quadOut
    );
}

function generateResultName() {
    const result =
        gameState.resultData;

    const language =
        gameState.language;

    if (!result) {
        return language === "ja"
            ? "できたてコーラ"
            : "Fresh Cola";
    }

    let prefix = "";

    if (
        result.topIngredientId &&
        RESULT_WORDS[
            language
        ] &&
        RESULT_WORDS[
            language
        ].topFlavor
    ) {
        prefix =
            RESULT_WORDS[
                language
            ].topFlavor[
                result.topIngredientId
            ] || "";
    }

    if (
        prefix === "" &&
        result.topIngredientId &&
        INGREDIENTS[
            result.topIngredientId
        ]
    ) {
        prefix =
            INGREDIENTS[
                result.topIngredientId
            ][language];
    }

    if (language === "ja") {
        if (prefix === "") {
            prefix = "不思議な";
        }

        let garnishText = "";

        if (
            result.garnish ===
            "cherry"
        ) {
            garnishText =
                "チェリー浮かぶ";
        } else if (
            result.garnish ===
            "lemon"
        ) {
            garnishText =
                "レモン添えの";
        }

        let baseName =
            "コーラ";

        if (
            result.burstCount > 0 ||
            result.pressure >=
                CONFIG.pressureMax
        ) {
            baseName =
                "限界炭酸コーラ";
        } else if (
            result.pressure >= 3
        ) {
            baseName =
                "強炭酸コーラ";
        }

        return (
            prefix +
            garnishText +
            baseName
        );
    }

    if (prefix === "") {
        prefix = "Mysterious";
    }

    let garnishText = "";

    if (
        result.garnish ===
        "cherry"
    ) {
        garnishText =
            " Cherry";
    } else if (
        result.garnish ===
        "lemon"
    ) {
        garnishText =
            " Lemon";
    }

    let baseName =
        " Cola";

    if (
        result.burstCount > 0 ||
        result.pressure >=
            CONFIG.pressureMax
    ) {
        baseName =
            " Limit Fizz Cola";
    } else if (
        result.pressure >= 3
    ) {
        baseName =
            " Extra Fizzy Cola";
    }

    return (
        prefix +
        garnishText +
        baseName
    );
}

function generateResultDescription() {
    const result =
        gameState.resultData;

    const language =
        gameState.language;

    if (!result) {
        return "";
    }

    if (language === "ja") {
        if (
            result.burstCount >= 2
        ) {
            return "何度も炭酸の限界を越えた、かなり危険な一杯。";
        }

        if (
            result.burstCount === 1
        ) {
            return "一度はじけても、まだ炭酸は元気です。";
        }

        if (
            result.stirCount >= 3
        ) {
            return "何度も混ぜられ、味の順番がすっかり変わりました。";
        }

        if (
            result.strange > 0
        ) {
            return "少し怪しい香りが、後味に残るコーラです。";
        }

        if (
            result.spilledCount > 0
        ) {
            return "少しこぼれましたが、無事に完成しました。";
        }

        if (
            result.chill >= 2
        ) {
            return "氷がたっぷり入った、冷たい一杯です。";
        }

        return "材料の重なりをそのまま味わう、できたての一杯です。";
    }

    if (
        result.burstCount >= 2
    ) {
        return "A dangerously fizzy cola that crossed the limit more than once.";
    }

    if (
        result.burstCount === 1
    ) {
        return "It burst once, but the fizz is still going strong.";
    }

    if (
        result.stirCount >= 3
    ) {
        return "Stirred again and again until every layer changed places.";
    }

    if (
        result.strange > 0
    ) {
        return "A slightly suspicious aroma lingers in the finish.";
    }

    if (
        result.spilledCount > 0
    ) {
        return "A little was spilled, but the cola made it to the finish.";
    }

    if (
        result.chill >= 2
    ) {
        return "A cold glass packed with plenty of ice.";
    }

    return "A freshly finished cola made from every layer collected.";
}

function getResultRestartButtonRect() {
    const portrait =
        HEIGHT > WIDTH;

    const width =
        Math.min(
            220,
            portrait
                ? WIDTH * 0.64
                : WIDTH * 0.28
        );

    const centerX =
        portrait
            ? WIDTH * 0.5
            : WIDTH * 0.70;

    return {
        x:
            centerX -
            width * 0.5,

        y: 20,
        w: width,
        h: 46,
    };
}


function restartGame() {
    const language =
        gameState.language;

    tween.stopAll();

    initGameState();

    gameState.language =
        language;

    updateLayout(true);

    gameState.phase =
        "WAIT_CAP_POWER";
}









function weightedRandomIngredient() {
    const pool = [
        {
            id: "vanilla",
            weight: 3,
        },
        {
            id: "caramel",
            weight: 3,
        },
        {
            id: "ginger",
            weight: 3,
        },
        {
            id: "cinnamon",
            weight: 3,
        },
        {
            id: "lemon_peel",
            weight: 3,
        },
        {
            id: "ice",
            weight: 3,
        },
        {
            id: "herb",
            weight: 1,
        },
        {
            id: "brown_sugar",
            weight: 1,
        },
        {
            id: "secret_syrup",
            weight: 1,
        },
    ];

    let totalWeight = 0;

    for (
        const item of pool
    ) {
        totalWeight +=
            item.weight;
    }

    let value =
        Math.random() *
        totalWeight;

    for (
        const item of pool
    ) {
        value -=
            item.weight;

        if (value < 0) {
            return item.id;
        }
    }

    return "vanilla";
}

function startMysteryIngredient() {
    gameState.phase =
        "MYSTERY_ROLLING";

    gameState.mysteryCount =
        (
            gameState.mysteryCount ||
            0
        ) +
        1;

    gameState.mystery = {
        visible: true,
        ingredientId: null,
        rollIndex: 0,
        scale: 0.65,
        alpha: 255,
        ringRotation: 0,
        locked: false,
    };

    let step =
        CONFIG.mysteryRollStep;

    const rollNext = function() {
        const mystery =
            gameState.mystery;

        if (!mystery) {
            return;
        }

        mystery.rollIndex += 1;

        let nextIngredient =
            weightedRandomIngredient();

        let attempts = 0;

        while (
            nextIngredient ===
                mystery.ingredientId &&
            attempts < 4
        ) {
            nextIngredient =
                weightedRandomIngredient();

            attempts += 1;
        }

        mystery.ingredientId =
            nextIngredient;

        mystery.scale = 0.72;

        tween(
            step,
            mystery,
            {
                scale: 1.08,
                ringRotation:
                    mystery.ringRotation +
                    52,
            },
            tween.easing.quadOut
        );

        if (
            mystery.rollIndex <
            CONFIG.mysteryRollCount
        ) {
            const timer = {
                value: 0,
            };

            tween(
                step,
                timer,
                {
                    value: 1,
                },
                tween.easing.linear,
                rollNext
            );

            step +=
                CONFIG.mysteryRollStepGrowth;

            return;
        }

        mystery.locked = true;

        gameState.phase =
            "MYSTERY_RESULT";

        tween(
            CONFIG.mysteryResultHoldDuration,
            mystery,
            {
                scale: 1.22,
                ringRotation:
                    mystery.ringRotation +
                    120,
            },
            tween.easing.bounceOut,
            function() {
                const ingredientId =
                    mystery.ingredientId;

                mystery.visible = false;

                startAddingIngredient(
                    ingredientId
                );
            }
        );
    };

    rollNext();
}




function startEventGate(node) {
    gameState.resolvedEvents[
        node.eventId
    ] = true;

    gameState.eventResultData = null;
    gameState.eventTarget1 = null;
    gameState.eventTarget2 = null;
    gameState.eventAnim = null;

    gameState.phase =
        "WAIT_EVENT_ROLL";
}

function rollEventDice() {
    gameState.phase =
        "EVENT_ROLLING";

    let rollCount = 0;
    let step =
        CONFIG.eventRouletteMinStep;

    const rollNext = function() {
        rollCount += 1;

        const eventIndex =
            Math.floor(
                Math.random() *
                EVENT_DIE.length
            );

        gameState.eventResultData =
            EVENT_DIE[eventIndex];

        if (
            rollCount <
            CONFIG.eventRouletteCount
        ) {
            const timer = {
                value: 0,
            };

            tween(
                step,
                timer,
                {
                    value: 1,
                },
                tween.easing.linear,
                rollNext
            );

            step +=
                CONFIG.eventRouletteStepGrowth;

            return;
        }

        gameState.phase =
            "SHOWING_EVENT_RESULT";

        const resultTimer = {
            value: 0,
        };

        tween(
            CONFIG.eventResultHoldDuration,
            resultTimer,
            {
                value: 1,
            },
            tween.easing.linear,
            function() {
                startEventWarning(
                    gameState.eventResultData.id
                );
            }
        );
    };

    rollNext();
}

function startEventWarning(eventId) {
    gameState.phase =
        "EVENT_WARNING";

    const slots =
        gameState.glass.slots;

    gameState.eventTarget1 = null;
    gameState.eventTarget2 = null;

    if (
        eventId === "swap" &&
        slots.length > 1
    ) {
        const index =
            Math.floor(
                Math.random() *
                (slots.length - 1)
            );

        gameState.eventTarget1 =
            slots[index];

        gameState.eventTarget2 =
            slots[index + 1];
    } else if (
        eventId === "spill" &&
        slots.length > 0
    ) {
        gameState.eventTarget1 =
            slots[
                slots.length - 1
            ];
    }

    gameState.eventAnim = {
        iconX: WIDTH * 0.5,
        iconY: HEIGHT * 0.5,
        iconSize: 104,
        iconAlpha: 255,
        panelMaskAlpha: 0,
    };

    tween(
        CONFIG.eventWarningDuration,
        gameState.eventAnim,
        {
            iconX:
                layout.glass.x +
                layout.glass.w -
                34,
            iconY:
                layout.glass.y +
                layout.glass.h -
                34,
            iconSize: 36,
            panelMaskAlpha: 145,
        },
        tween.easing.quadOut,
        function() {
            gameState.phase =
                "ANIMATING_EVENT";

            applyEventAnimation(
                eventId
            );
        }
    );
}

function applyEventAnimation(eventId) {
    gameState.stirCount += 1;

    if (eventId === "flip") {
        applyFlipEvent();
        return;
    }

    if (eventId === "swap") {
        applySwapEvent();
        return;
    }

    if (eventId === "spill") {
        applySpillEvent();
        return;
    }

    finishEvent();
}

function applyFlipEvent() {
    const slots =
        gameState.glass.slots;

    if (slots.length === 0) {
        finishEventAfterDelay(0.35);
        return;
    }

    if (slots.length === 1) {
        const token =
            slots[0];

        token.drawX = 0;
        token.drawY =
            getGlassSlotLocalY(0);
        token.rot = 0;

        tween(
            CONFIG.flipLiftDuration,
            token,
            {
                drawY:
                    token.drawY + 22,
                rot: 18,
            },
            tween.easing.quadOut,
            function() {
                tween(
                    CONFIG.flipSettleDuration,
                    token,
                    {
                        drawY:
                            getGlassSlotLocalY(
                                0
                            ),
                        rot: 0,
                    },
                    tween.easing.bounceOut,
                    function() {
                        resetGlassTokenTransforms();
                        finishEvent();
                    }
                );
            }
        );

        return;
    }

    for (
        let index = 0;
        index < slots.length;
        index += 1
    ) {
        const token =
            slots[index];

        const startY =
            getGlassSlotLocalY(
                index
            );

        const targetY =
            getGlassSlotLocalY(
                slots.length -
                    index -
                    1
            );

        const direction =
            index % 2 === 0
                ? -1
                : 1;

        token.drawX = 0;
        token.drawY = startY;
        token.rot = 0;

        tween(
            CONFIG.flipLiftDuration,
            token,
            {
                drawY:
                    startY + 20,
                rot:
                    direction * 12,
            },
            tween.easing.quadOut,
            function() {
                tween(
                    CONFIG.flipMoveDuration,
                    token,
                    {
                        drawX:
                            direction * 42,
                        drawY: targetY,
                        rot:
                            direction * 28,
                    },
                    tween.easing.sineInOut,
                    function() {
                        tween(
                            CONFIG.flipSettleDuration,
                            token,
                            {
                                drawX: 0,
                                rot: 0,
                            },
                            tween.easing.quadIn
                        );
                    }
                );
            }
        );
    }

    const totalDuration =
        CONFIG.flipLiftDuration +
        CONFIG.flipMoveDuration +
        CONFIG.flipSettleDuration;

    const timer = {
        value: 0,
    };

    tween(
        totalDuration,
        timer,
        {
            value: 1,
        },
        tween.easing.linear,
        function() {
            gameState.glass.slots.reverse();
            resetGlassTokenTransforms();
            finishEvent();
        }
    );
}

function applySwapEvent() {
    const slots =
        gameState.glass.slots;

    const token1 =
        gameState.eventTarget1;

    const token2 =
        gameState.eventTarget2;

    if (
        slots.length > 1 &&
        token1 &&
        token2
    ) {
        const index1 =
            slots.indexOf(token1);

        const index2 =
            slots.indexOf(token2);

        if (
            index1 < 0 ||
            index2 < 0
        ) {
            finishEventAfterDelay(0.35);
            return;
        }

        const y1 =
            getGlassSlotLocalY(
                index1
            );

        const y2 =
            getGlassSlotLocalY(
                index2
            );

        token1.drawX = 0;
        token1.drawY = y1;
        token1.rot = 0;

        token2.drawX = 0;
        token2.drawY = y2;
        token2.rot = 0;

        tween(
            CONFIG.swapOutDuration,
            token1,
            {
                drawX: -52,
                rot: -12,
            },
            tween.easing.quadOut,
            function() {
                tween(
                    CONFIG.swapCrossDuration,
                    token1,
                    {
                        drawY: y2,
                    },
                    tween.easing.sineInOut,
                    function() {
                        tween(
                            CONFIG.swapInDuration,
                            token1,
                            {
                                drawX: 0,
                                rot: 0,
                            },
                            tween.easing.quadIn
                        );
                    }
                );
            }
        );

        tween(
            CONFIG.swapOutDuration,
            token2,
            {
                drawX: 52,
                rot: 12,
            },
            tween.easing.quadOut,
            function() {
                tween(
                    CONFIG.swapCrossDuration,
                    token2,
                    {
                        drawY: y1,
                    },
                    tween.easing.sineInOut,
                    function() {
                        tween(
                            CONFIG.swapInDuration,
                            token2,
                            {
                                drawX: 0,
                                rot: 0,
                            },
                            tween.easing.quadIn,
                            function() {
                                slots[index1] =
                                    token2;

                                slots[index2] =
                                    token1;

                                resetGlassTokenTransforms();
                                finishEvent();
                            }
                        );
                    }
                );
            }
        );

        return;
    }

    if (slots.length === 1) {
        const token =
            slots[0];

        token.drawX = 0;
        token.drawY =
            getGlassSlotLocalY(0);
        token.rot = 0;

        tween(
            0.15,
            token,
            {
                drawX: 20,
            },
            tween.easing.sineInOut,
            function() {
                tween(
                    0.15,
                    token,
                    {
                        drawX: -20,
                    },
                    tween.easing.sineInOut,
                    function() {
                        tween(
                            0.15,
                            token,
                            {
                                drawX: 0,
                            },
                            tween.easing.sineInOut,
                            function() {
                                resetGlassTokenTransforms();
                                finishEvent();
                            }
                        );
                    }
                );
            }
        );

        return;
    }

    finishEventAfterDelay(0.35);
}

function applySpillEvent() {
    const slots =
        gameState.glass.slots;

    const spilled =
        gameState.eventTarget1;

    if (
        slots.length === 0 ||
        !spilled
    ) {
        finishEventAfterDelay(0.40);
        return;
    }

    const index =
        slots.indexOf(spilled);

    if (index < 0) {
        finishEventAfterDelay(0.40);
        return;
    }

    spilled.drawX = 0;
    spilled.drawY =
        getGlassSlotLocalY(index);
    spilled.rot = 0;

    tween(
        CONFIG.spillShakeDuration,
        spilled,
        {
            drawX: 12,
            rot: 8,
        },
        tween.easing.bounceInOut,
        function() {
            tween(
                CONFIG.spillMoveDuration,
                spilled,
                {
                    drawX: 145,
                    drawY:
                        spilled.drawY - 65,
                    rot: 90,
                },
                tween.easing.quadIn,
                function() {
                    const currentIndex =
                        slots.indexOf(
                            spilled
                        );

                    if (
                        currentIndex >= 0
                    ) {
                        slots.splice(
                            currentIndex,
                            1
                        );
                    }

                    spilled.spillReason =
                        "event";

                    gameState.glass.spilledTokens.push(
                        spilled
                    );

                    resetGlassTokenTransforms();
                    finishEvent();
                }
            );
        }
    );
}

function finishEventAfterDelay(duration) {
    const timer = {
        value: 0,
    };

    tween(
        duration,
        timer,
        {
            value: 1,
        },
        tween.easing.linear,
        function() {
            finishEvent();
        }
    );
}

function finishEvent() {
    gameState.phase =
        "EVENT_FINISHED";

    if (gameState.eventAnim) {
        tween(
            CONFIG.eventFinishHoldDuration,
            gameState.eventAnim,
            {
                iconAlpha: 0,
                panelMaskAlpha: 0,
            },
            tween.easing.quadIn
        );
    }

    const timer = {
        value: 0,
    };

    tween(
        CONFIG.eventFinishHoldDuration,
        timer,
        {
            value: 1,
        },
        tween.easing.linear,
        function() {
            resetGlassTokenTransforms();

            gameState.eventResultData =
                null;

            gameState.eventTarget1 =
                null;

            gameState.eventTarget2 =
                null;

            gameState.eventAnim =
                null;

            if (
                gameState.remainingSteps > 0
            ) {
                moveOneStep();
            } else {
                gameState.phase =
                    "WAIT_CAP_POWER";
            }
        }
    );
}











function showGarnishReveal(garnish, onComplete) {
    gameState.phase =
        "GARNISH_REVEAL";

    gameState.garnishEffect.visible =
        true;

    gameState.garnishEffect.scale =
        0.35;

    gameState.garnishEffect.alpha =
        0;

    tween(
        CONFIG.garnishRevealDuration,
        gameState.garnishEffect,
        {
            scale: 1.18,
            alpha: 255,
        },
        tween.easing.bounceOut,
        function() {
            tween(
                CONFIG.garnishHoldDuration,
                gameState.garnishEffect,
                {
                    scale: 1,
                },
                tween.easing.quadOut,
                function() {
                    gameState.garnishEffect.visible =
                        false;

                    gameState.garnishEffect.scale =
                        1;

                    gameState.garnishEffect.alpha =
                        255;

                    if (onComplete) {
                        onComplete();
                    }
                }
            );
        }
    );
}

function changePressure(delta, onComplete) {
    if (delta === 0) {
        if (onComplete) {
            onComplete();
        }

        return;
    }

    if (
        delta > 0 &&
        gameState.glass.pressure >=
            CONFIG.pressureMax
    ) {
        triggerBurst(
            onComplete
        );

        return;
    }

    gameState.phase =
        "PRESSURE_CHANGE";

    const previousPressure =
        gameState.glass.pressure;

    gameState.glass.pressure =
        Math.max(
            CONFIG.pressureMin,
            Math.min(
                CONFIG.pressureMax,
                gameState.glass.pressure +
                    delta
            )
        );

    const changed =
        gameState.glass.pressure -
        previousPressure;

    const position =
        getGlassPressureScreenPosition();

    gameState.pressureEffect.visible =
        true;

    gameState.pressureEffect.text =
        changed > 0
            ? "+1"
            : "-1";

    gameState.pressureEffect.x =
        position.x;

    gameState.pressureEffect.y =
        position.y;

    gameState.pressureEffect.scale =
        0.55;

    gameState.pressureEffect.alpha =
        0;

    gameState.pressureEffect.positive =
        changed > 0;

    if (changed > 0) {
        spawnCarbonationParticles(
            CONFIG.pressureBubbleCount,
            false
        );
    }

    gameState.glassPulse.scale =
        changed > 0
            ? 0.92
            : 1.08;

    tween(
        CONFIG.pressureChangeDuration,
        gameState.glassPulse,
        {
            scale: 1,
        },
        tween.easing.bounceOut
    );

    tween(
        CONFIG.pressureChangeDuration,
        gameState.pressureEffect,
        {
            y:
                position.y +
                34,
            scale: 1.25,
            alpha: 255,
        },
        tween.easing.quadOut,
        function() {
            tween(
                CONFIG.pressureResultHoldDuration,
                gameState.pressureEffect,
                {
                    y:
                        position.y +
                        48,
                    scale: 0.88,
                    alpha: 0,
                },
                tween.easing.quadIn,
                function() {
                    gameState.pressureEffect.visible =
                        false;

                    if (onComplete) {
                        onComplete();
                    }
                }
            );
        }
    );
}

function triggerBurst(onComplete) {
    gameState.phase =
        "BURSTING";

    gameState.burstCount += 1;

    gameState.burstState = {
        shake: 1,
        flash: 1,
    };

    spawnCarbonationParticles(
        CONFIG.burstParticleCount,
        true
    );

    tween(
        CONFIG.burstDuration,
        gameState.burstState,
        {
            shake: 0,
            flash: 0,
        },
        tween.easing.quadOut
    );

    if (
        gameState.glass.slots.length > 0
    ) {
        const tokenIndex =
            gameState.glass.slots.length -
            1;

        const position =
            getGlassSlotScreenPosition(
                tokenIndex
            );

        const spilled =
            gameState.glass.slots.pop();

        spilled.spillReason =
            "burst";

        gameState.burstToken = {
            ingredientId:
                spilled.ingredientId,
            sourceToken: spilled,
            x: position.x,
            y: position.y,
            rotation: 0,
            scale: 1,
            alpha: 255,
        };

        tween(
            CONFIG.burstTokenFlightDuration,
            gameState.burstToken,
            {
                x:
                    position.x +
                    Math.random() * 110 -
                    55,
                y:
                    position.y +
                    170 +
                    Math.random() * 45,
                rotation:
                    220 +
                    Math.random() * 180,
                scale: 0.65,
                alpha: 80,
            },
            tween.easing.quadOut,
            function() {
                gameState.glass.spilledTokens.push(
                    spilled
                );

                gameState.burstToken =
                    null;
            }
        );
    }

    const timer = {
        value: 0,
    };

    tween(
        CONFIG.burstDuration,
        timer,
        {
            value: 1,
        },
        tween.easing.linear,
        function() {
            gameState.glass.pressure =
                CONFIG.burstResetPressure;

            gameState.phase =
                "BURST_RESULT";

            const holdTimer = {
                value: 0,
            };

            tween(
                CONFIG.burstResultHoldDuration,
                holdTimer,
                {
                    value: 1,
                },
                tween.easing.linear,
                function() {
                    gameState.burstState =
                        null;

                    if (onComplete) {
                        onComplete();
                    }
                }
            );
        }
    );
}

function getGlassScreenGeometry() {
    const panel =
        layout.glass;

    const scaleValue =
        Math.min(
            panel.w / 160,
            panel.h / 320,
            0.86
        );

    const slotH = 45;

    const glassH =
        slotH *
            CONFIG.glassCapacity +
        10;

    const topW = 130;
    const bottomW = 100;

    const centerX =
        panel.x +
        panel.w * 0.50;

    const centerY =
        panel.y +
        panel.h * 0.47;

    return {
        centerX: centerX,
        centerY: centerY,
        scale: scaleValue,
        glassH: glassH,
        topW: topW,
        bottomW: bottomW,
        left:
            centerX -
            topW *
                scaleValue *
                0.5,
        right:
            centerX +
            topW *
                scaleValue *
                0.5,
        bottom:
            centerY -
            glassH *
                scaleValue *
                0.5,
        top:
            centerY +
            glassH *
                scaleValue *
                0.5,
    };
}

function getGlassPressureScreenPosition() {
    const geometry =
        getGlassScreenGeometry();

    return {
        x:
            geometry.centerX,
        y:
            geometry.bottom - 22,
    };
}

function spawnCarbonationParticles(count, burst) {
    const geometry =
        getGlassScreenGeometry();

    for (
        let index = 0;
        index < count;
        index += 1
    ) {
        const startX =
            geometry.centerX +
            Math.random() *
                geometry.bottomW *
                geometry.scale -
            geometry.bottomW *
                geometry.scale *
                0.5;

        const startY =
            burst
                ? geometry.centerY +
                    Math.random() *
                        geometry.glassH *
                        geometry.scale *
                        0.55
                : geometry.bottom +
                    Math.random() * 30;

        const life =
            burst
                ? 0.75 +
                    Math.random() * 0.75
                : 0.65 +
                    Math.random() * 0.55;

        gameState.carbonationParticles.push(
            {
                x: startX,
                y: startY,
                vx:
                    burst
                        ? Math.random() *
                                150 -
                            75
                        : Math.random() *
                                18 -
                            9,
                vy:
                    burst
                        ? 80 +
                            Math.random() *
                                150
                        : 45 +
                            Math.random() *
                                45,
                size:
                    3 +
                    Math.random() * 5,
                life: life,
                maxLife: life,
                burst: burst,
            }
        );
    }
}

function updateCarbonationParticles() {
    if (
        gameState.glass.pressure > 0 &&
        gameState.phase !== "TITLE" &&
        Math.random() <
            gameState.glass.pressure *
                DeltaTime *
                0.75
    ) {
        spawnCarbonationParticles(
            1,
            false
        );
    }

    for (
        let index =
            gameState.carbonationParticles.length -
            1;
        index >= 0;
        index -= 1
    ) {
        const particle =
            gameState.carbonationParticles[
                index
            ];

        particle.life -=
            DeltaTime;

        particle.x +=
            particle.vx *
            DeltaTime;

        particle.y +=
            particle.vy *
            DeltaTime;

        particle.vx *=
            0.985;

        if (particle.burst) {
            particle.vy -=
                120 *
                DeltaTime;
        } else {
            particle.x +=
                Math.sin(
                    ElapsedTime * 8 +
                    index
                ) *
                10 *
                DeltaTime;
        }

        if (particle.life <= 0) {
            gameState.carbonationParticles.splice(
                index,
                1
            );
        }
    }
}









function startAddingIngredient(ingredientId) {
    const source =
        getBoardNodeScreenPosition(
            gameState.currentNodeId
        );

    const slotIndex =
        Math.min(
            gameState.glass.slots.length,
            CONFIG.glassCapacity - 1
        );

    const destination =
        getGlassSlotScreenPosition(
            slotIndex
        );

    gameState.phase =
        "SHOWING_INGREDIENT";

    gameState.landingIngredientEffect = {
        visible: true,
        nodeId:
            gameState.currentNodeId,
        ingredientId: ingredientId,
        pulse: 0,
        alpha: 0,
    };

    gameState.flyingIngredient = {
        ingredientId: ingredientId,
        x: source.x,
        y: source.y,
        scale: 0.55,
        alpha: 0,
        rotation: 0,
    };

    tween(
        CONFIG.ingredientRevealDuration,
        gameState.landingIngredientEffect,
        {
            pulse: 1,
            alpha: 255,
        },
        tween.easing.quadOut
    );

    tween(
        CONFIG.ingredientRevealDuration,
        gameState.flyingIngredient,
        {
            y:
                source.y +
                CONFIG.ingredientSourceLift,
            scale: 1.28,
            alpha: 255,
            rotation: 35,
        },
        tween.easing.bounceOut,
        function() {
            gameState.phase =
                "FLYING_INGREDIENT";

            tween(
                CONFIG.ingredientFlightDuration,
                gameState.landingIngredientEffect,
                {
                    pulse: 1.8,
                    alpha: 0,
                },
                tween.easing.quadOut,
                function() {
                    gameState.landingIngredientEffect.visible =
                        false;
                }
            );

            tween(
                CONFIG.ingredientFlightDuration,
                gameState.flyingIngredient,
                {
                    x: destination.x,
                    y: destination.y,
                    scale: 0.82,
                    rotation: 180,
                },
                tween.easing.quadInOut,
                function() {
                    completeIngredientAddition(
                        ingredientId
                    );
                }
            );
        }
    );
}

function getBoardNodeScreenPosition(nodeId) {
    const node =
        BOARD_NODES[nodeId];

    const panel =
        layout.board;

    if (!node) {
        return {
            x:
                panel.x +
                panel.w * 0.5,
            y:
                panel.y +
                panel.h * 0.5,
        };
    }

    const worldX =
        node.nx *
        CONFIG.mapWidth;

    const worldY =
        node.ny *
        CONFIG.mapHeight;

    return {
        x:
            panel.x +
            (worldX -
                gameState.camera.x) *
                gameState.camera.zoom +
            panel.w * 0.5,

        y:
            panel.y +
            (worldY -
                gameState.camera.y) *
                gameState.camera.zoom +
            panel.h * 0.28,
    };
}

function getGlassSlotScreenPosition(slotIndex) {
    const panel =
        layout.glass;

    const scaleValue =
        Math.min(
            panel.w / 160,
            panel.h / 320,
            0.86
        );

    const glassX =
        panel.x +
        panel.w * 0.5;

    const glassY =
        panel.y +
        panel.h * 0.47;

    const slotH = 45;

    const glassH =
        slotH *
            CONFIG.glassCapacity +
        10;

    const localY =
        -glassH / 2 +
        5 +
        slotH / 2 +
        slotIndex * slotH;

    return {
        x: glassX,
        y:
            glassY +
            localY *
                scaleValue,
    };
}

function getGlassSlotLocalY(slotIndex) {
    const slotH = 45;

    const glassH =
        slotH *
            CONFIG.glassCapacity +
        10;

    return (
        -glassH / 2 +
        5 +
        slotH / 2 +
        slotIndex * slotH
    );
}

function resetGlassTokenTransforms() {
    for (
        const token of
        gameState.glass.slots
    ) {
        delete token.drawX;
        delete token.drawY;
        delete token.rot;
    }
}

function shouldUseGlassTokenTransforms() {
    return (
        gameState.phase === "GLASS_FULL_WARNING" ||
        gameState.phase === "CAPACITY_SPILLING" ||
        gameState.phase === "ADDING_TOKEN" ||
        gameState.phase === "EVENT_WARNING" ||
        gameState.phase === "ANIMATING_EVENT" ||
        gameState.phase === "EVENT_FINISHED" ||
        gameState.phase === "BURST_WARNING" ||
        gameState.phase === "BURSTING" ||
        gameState.phase === "BURST_RESULT"
    );
}




function completeIngredientAddition(ingredientId) {
    if (
        gameState.glass.slots.length >=
        CONFIG.glassCapacity
    ) {
        startCapacitySpillAndAdd(
            ingredientId
        );

        return;
    }

    gameState.flyingIngredient = null;

    addIngredientToken(
        ingredientId,
        false
    );
}

function startCapacitySpillAndAdd(ingredientId) {
    const slots =
        gameState.glass.slots;

    const topIndex =
        slots.length - 1;

    const spilled =
        slots[topIndex];

    if (!spilled) {
        gameState.flyingIngredient = null;

        addIngredientToken(
            ingredientId,
            false
        );

        return;
    }

    gameState.phase =
        "GLASS_FULL_WARNING";

    gameState.glassFullCount += 1;

    spilled.drawX = 0;
    spilled.drawY =
        getGlassSlotLocalY(
            topIndex
        );

    spilled.rot = 0;

    const panel =
        layout.glass;

    const effect =
        gameState.glassFullEffect;

    effect.visible = true;

    effect.text =
        gameState.language === "ja"
            ? "グラスがいっぱい"
            : "GLASS IS FULL";

    effect.x =
        panel.x +
        panel.w * 0.5;

    effect.y =
        panel.y +
        panel.h -
        30;

    effect.scale = 0.7;
    effect.alpha = 0;
    effect.ring = 0;

    gameState.glassPulse.scale =
        1;

    tween(
        CONFIG.glassFullWarningDuration,
        gameState.glassPulse,
        {
            scale: 1.08,
        },
        tween.easing.bounceOut
    );

    tween(
        CONFIG.glassFullWarningDuration,
        effect,
        {
            scale: 1,
            alpha: 255,
            ring: 1,
        },
        tween.easing.bounceOut
    );

    if (
        gameState.flyingIngredient
    ) {
        tween(
            CONFIG.glassFullWarningDuration,
            gameState.flyingIngredient,
            {
                y:
                    gameState.flyingIngredient.y +
                    34,
                scale: 0.72,
                rotation:
                    gameState.flyingIngredient.rotation +
                    35,
            },
            tween.easing.quadOut
        );
    }

    const warningTimer = {
        value: 0,
    };

    tween(
        CONFIG.glassFullWarningDuration,
        warningTimer,
        {
            value: 1,
        },
        tween.easing.linear,
        function() {
            gameState.phase =
                "CAPACITY_SPILLING";

            tween(
                CONFIG.capacitySpillDuration,
                effect,
                {
                    scale: 0.9,
                    alpha: 0,
                    ring: 1.7,
                },
                tween.easing.quadIn
            );

            tween(
                CONFIG.capacitySpillDuration,
                spilled,
                {
                    drawX:
                        CONFIG.capacitySpillDistance,
                    drawY:
                        spilled.drawY -
                        CONFIG.capacitySpillDrop,
                    rot: 55,
                },
                tween.easing.quadIn,
                function() {
                    const currentIndex =
                        slots.indexOf(
                            spilled
                        );

                    if (
                        currentIndex >= 0
                    ) {
                        slots.splice(
                            currentIndex,
                            1
                        );
                    }

                    spilled.spillReason =
                        "capacity";

                    delete spilled.drawX;
                    delete spilled.drawY;
                    delete spilled.rot;

                    gameState.glass.spilledTokens.push(
                        spilled
                    );

                    effect.visible = false;
                    effect.alpha = 0;
                    effect.ring = 0;

                    gameState.flyingIngredient =
                        null;

                    resetGlassTokenTransforms();

                    addIngredientToken(
                        ingredientId,
                        true
                    );
                }
            );
        }
    );
}

function addIngredientToken(
    ingredientId,
    animateEntry
) {
    const targetIndex =
        gameState.glass.slots.length;

    const targetY =
        getGlassSlotLocalY(
            targetIndex
        );

    const token = {
        uid:
            gameState.nextTokenUid,
        ingredientId: ingredientId,
        drawX: 0,
        drawY:
            animateEntry
                ? targetY + 42
                : targetY,
        rot: 0,
    };

    gameState.nextTokenUid += 1;

    gameState.glass.slots.push(
        token
    );

    gameState.phase =
        "ADDING_TOKEN";

    if (animateEntry) {
        tween(
            CONFIG.capacityIncomingSettleDuration,
            token,
            {
                drawY: targetY,
            },
            tween.easing.bounceOut,
            function() {
                delete token.drawX;
                delete token.drawY;
                delete token.rot;

                finishIngredientAddition();
            }
        );

        return;
    }

    delete token.drawX;
    delete token.drawY;
    delete token.rot;

    finishIngredientAddition();
}

function finishIngredientAddition() {
    gameState.glassPulse.scale =
        0.88;

    tween(
        CONFIG.ingredientGlassBounceDuration,
        gameState.glassPulse,
        {
            scale: 1.14,
        },
        tween.easing.quadOut,
        function() {
            tween(
                CONFIG.ingredientGlassSettleDuration,
                gameState.glassPulse,
                {
                    scale: 1,
                },
                tween.easing.bounceOut,
                function() {
                    const timer = {
                        value: 0,
                    };

                    tween(
                        CONFIG.ingredientResultHoldDuration,
                        timer,
                        {
                            value: 1,
                        },
                        tween.easing.linear,
                        function() {
                            gameState.phase =
                                "WAIT_CAP_POWER";
                        }
                    );
                }
            );
        }
    );
}
























function initGameData() {
  CONFIG = {
    debugText: false,

    mapWidth: WIDTH * 1.5,
    mapHeight: HEIGHT * 4.5,

    cameraZoom: 1.0,
    cameraLookAheadY: 80,

    nodeSize: 14,
    currentNodeSize: 26,

    glassCapacity: 5,
    pressureMax: 5,

    capSize: 30,
  };

  TEXT = {
    ja: {
      title: "コーラすごろく",
      langButton: "EN",
    },
    en: {
      title: "COLA ROLL",
      langButton: "JP",
    },
  };

  INGREDIENTS = {
    base_syrup: {
      id: "base_syrup",
      ja: "基本シロップ",
      en: "Base Syrup",
      color: color(180, 100, 20),
      sweetness: 1,
      spice: 0,
      chill: 0,
      strange: 0,
    },

    thick_syrup: {
      id: "thick_syrup",
      ja: "濃いシロップ",
      en: "Thick Syrup",
      color: color(120, 60, 10),
      sweetness: 2,
      spice: 0,
      chill: 0,
      strange: 0,
    },

    vanilla: {
      id: "vanilla",
      ja: "バニラ",
      en: "Vanilla",
      color: color(255, 250, 200),
      sweetness: 1,
      spice: 0,
      chill: 0,
      strange: 0,
    },

    caramel: {
      id: "caramel",
      ja: "キャラメル",
      en: "Caramel",
      color: color(150, 80, 0),
      sweetness: 2,
      spice: 0,
      chill: 0,
      strange: 0,
    },

    ginger: {
      id: "ginger",
      ja: "生姜",
      en: "Ginger",
      color: color(200, 180, 80),
      sweetness: 0,
      spice: 1,
      chill: 0,
      strange: 0,
    },

    cinnamon: {
      id: "cinnamon",
      ja: "シナモン",
      en: "Cinnamon",
      color: color(160, 70, 30),
      sweetness: 0,
      spice: 1,
      chill: 0,
      strange: 0,
    },

    lemon_peel: {
      id: "lemon_peel",
      ja: "レモンピール",
      en: "Lemon Peel",
      color: color(220, 220, 50),
      sweetness: 0,
      spice: 1,
      chill: 0,
      strange: 0,
    },

    ice: {
      id: "ice",
      ja: "氷",
      en: "Ice",
      color: color(200, 240, 255, 210),
      sweetness: 0,
      spice: 0,
      chill: 1,
      strange: 0,
    },

    herb: {
      id: "herb",
      ja: "薬草",
      en: "Herb",
      color: color(50, 100, 50),
      sweetness: 0,
      spice: 1,
      chill: 0,
      strange: 1,
    },

    brown_sugar: {
      id: "brown_sugar",
      ja: "黒糖",
      en: "Brown Sugar",
      color: color(80, 50, 20),
      sweetness: 2,
      spice: 0,
      chill: 0,
      strange: 1,
    },

    secret_syrup: {
      id: "secret_syrup",
      ja: "秘伝シロップ",
      en: "Secret Syrup",
      color: color(50, 20, 60),
      sweetness: 1,
      spice: 1,
      chill: 0,
      strange: 2,
    },
  };

  EVENT_DIE = [
    { id: "flip" },
    { id: "flip" },
    { id: "swap" },
    { id: "swap" },
    { id: "spill" },
    { id: "spill" },
  ];

  RESULT_WORDS = {
    ja: {
      topFlavor: {
        base_syrup: "素朴なシロップの",
        thick_syrup: "コクのある",
        vanilla: "バニラ香る",
        caramel: "キャラメル風味の",
        ginger: "生姜香る",
        cinnamon: "シナモン香る",
        lemon_peel: "レモン香る",
        ice: "冷え冷えの",
        herb: "薬草香る",
        brown_sugar: "黒糖香る",
        secret_syrup: "秘伝の香り漂う",
      },
    },

    en: {
      topFlavor: {
        base_syrup: "Simple Syrup",
        thick_syrup: "Rich",
        vanilla: "Vanilla",
        caramel: "Caramel",
        ginger: "Ginger",
        cinnamon: "Cinnamon",
        lemon_peel: "Lemon",
        ice: "Ice-Cold",
        herb: "Herbal",
        brown_sugar: "Brown Sugar",
        secret_syrup: "Secret Syrup",
      },
    },
  };

  BOARD_NODES = {
    start: {
      id: "start",
      nx: 0.25,
      ny: 0.05,
      next: "base_syrup",
      effect: {},
    },

    base_syrup: {
      id: "base_syrup",
      nx: 0.25,
      ny: 0.10,
      next: "pour_carbon",
      effect: {
        addIngredient: "base_syrup",
      },
    },

    pour_carbon: {
      id: "pour_carbon",
      nx: 0.25,
      ny: 0.15,
      next: "ice1",
      effect: {
        pressureDelta: 1,
      },
    },

    ice1: {
      id: "ice1",
      nx: 0.25,
      ny: 0.20,
      next: "vanilla1",
      effect: {
        addIngredient: "ice",
      },
    },

    vanilla1: {
      id: "vanilla1",
      nx: 0.25,
      ny: 0.25,
      next: "stir1",
      effect: {
        addIngredient: "vanilla",
      },
    },

    stir1: {
      id: "stir1",
      nx: 0.25,
      ny: 0.30,
      next: "syrup2",
      effect: {},
      nodeType: "event_gate",
      eventId: "stir1",
    },

    syrup2: {
      id: "syrup2",
      nx: 0.25,
      ny: 0.35,
      next: "branch1",
      effect: {
        addIngredient: "base_syrup",
      },
    },

    branch1: {
      id: "branch1",
      nx: 0.25,
      ny: 0.40,
      effect: {},
      choices: [
        {
          id: "sweet",
          next: "sweet_vanilla",
        },
        {
          id: "spice",
          next: "spice_ginger",
        },
      ],
    },

    sweet_vanilla: {
      id: "sweet_vanilla",
      routeId: "sweet",
      nx: 0.10,
      ny: 0.45,
      next: "sweet_caramel",
      effect: {
        addIngredient: "vanilla",
      },
    },

    sweet_caramel: {
      id: "sweet_caramel",
      routeId: "sweet",
      nx: 0.10,
      ny: 0.50,
      next: "sweet_stir",
      effect: {
        addIngredient: "caramel",
      },
    },

    sweet_stir: {
      id: "sweet_stir",
      routeId: "sweet",
      nx: 0.10,
      ny: 0.55,
      next: "sweet_sugar",
      effect: {},
      nodeType: "event_gate",
      eventId: "stir_sweet",
    },

    sweet_sugar: {
      id: "sweet_sugar",
      routeId: "sweet",
      nx: 0.10,
      ny: 0.60,
      next: "sweet_strong",
      effect: {
        addIngredient: "brown_sugar",
      },
    },

    sweet_strong: {
      id: "sweet_strong",
      routeId: "sweet",
      nx: 0.10,
      ny: 0.65,
      next: "merge1",
      effect: {
        addIngredient: "thick_syrup",
      },
    },

    spice_ginger: {
      id: "spice_ginger",
      routeId: "spice",
      nx: 0.40,
      ny: 0.45,
      next: "spice_cinnamon",
      effect: {
        addIngredient: "ginger",
      },
    },

    spice_cinnamon: {
      id: "spice_cinnamon",
      routeId: "spice",
      nx: 0.40,
      ny: 0.50,
      next: "spice_stir",
      effect: {
        addIngredient: "cinnamon",
      },
    },

    spice_stir: {
      id: "spice_stir",
      routeId: "spice",
      nx: 0.40,
      ny: 0.55,
      next: "spice_herb",
      effect: {},
      nodeType: "event_gate",
      eventId: "stir_spice",
    },

    spice_herb: {
      id: "spice_herb",
      routeId: "spice",
      nx: 0.40,
      ny: 0.60,
      next: "spice_lemon",
      effect: {
        addIngredient: "herb",
      },
    },

    spice_lemon: {
      id: "spice_lemon",
      routeId: "spice",
      nx: 0.40,
      ny: 0.65,
      next: "merge1",
      effect: {
        addIngredient: "lemon_peel",
      },
    },

    merge1: {
      id: "merge1",
      nx: 0.25,
      ny: 0.70,
      next: "carb2",
      effect: {
        addIngredient: "base_syrup",
      },
    },

    carb2: {
      id: "carb2",
      nx: 0.25,
      ny: 0.75,
      next: "mystery",
      effect: {
        pressureDelta: 1,
      },
    },

    mystery: {
      id: "mystery",
      nx: 0.25,
      ny: 0.80,
      next: "ice2",
      effect: {
        addMystery: true,
      },
    },

    ice2: {
      id: "ice2",
      nx: 0.25,
      ny: 0.85,
      next: "stir2",
      effect: {
        addIngredient: "ice",
      },
    },

    stir2: {
      id: "stir2",
      nx: 0.25,
      ny: 0.90,
      next: "branch2",
      effect: {},
      nodeType: "event_gate",
      eventId: "stir_common",
    },

    branch2: {
      id: "branch2",
      nx: 0.25,
      ny: 0.95,
      effect: {},
      choices: [
        {
          id: "safe",
          next: "safe_lemon",
        },
        {
          id: "risky",
          next: "risk_fizz",
        },
      ],
    },

    safe_lemon: {
      id: "safe_lemon",
      routeId: "safe",
      nx: 0.10,
      ny: 1.00,
      next: "safe_base_syrup",
      effect: {
        pressureDelta: -1,
        garnish: "lemon",
      },
    },

    safe_base_syrup: {
      id: "safe_base_syrup",
      routeId: "safe",
      nx: 0.10,
      ny: 1.05,
      next: "safe_cherry",
      effect: {
        addIngredient: "base_syrup",
      },
    },

    safe_cherry: {
      id: "safe_cherry",
      routeId: "safe",
      nx: 0.10,
      ny: 1.10,
      next: "goal",
      effect: {
        pressureDelta: -1,
        garnish: "cherry",
      },
    },

    risk_fizz: {
      id: "risk_fizz",
      routeId: "risky",
      nx: 0.40,
      ny: 1.00,
      next: "risk_stir",
      effect: {
        pressureDelta: 1,
      },
    },

    risk_stir: {
      id: "risk_stir",
      routeId: "risky",
      nx: 0.40,
      ny: 1.05,
      next: "risk_mystery",
      effect: {},
      nodeType: "event_gate",
      eventId: "stir_risky",
    },

    risk_mystery: {
      id: "risk_mystery",
      routeId: "risky",
      nx: 0.40,
      ny: 1.10,
      next: "risk_mix",
      effect: {
        addMystery: true,
      },
    },

    risk_mix: {
      id: "risk_mix",
      routeId: "risky",
      nx: 0.40,
      ny: 1.15,
      next: "goal",
      effect: {},
      nodeType: "event_gate",
      eventId: "risk_mix",
    },

    goal: {
      id: "goal",
      nx: 0.25,
      ny: 1.20,
      next: null,
      effect: {},
    },
  };
}

function initCapPowerConfig() {
    CONFIG.capGaugeSpeed = 1.65;
    CONFIG.capPowerZone1End = 0.28;
    CONFIG.capPowerZone2End = 0.62;
    CONFIG.capPowerZone3End = 0.90;
    CONFIG.capOverStart = 0.90;
    CONFIG.capBoundaryMargin = 0.05;
    CONFIG.capFlightDuration = 0.45;
    CONFIG.capBounceDuration = 0.24;
    CONFIG.capRotationSpeed = 360;
    CONFIG.capResultHoldDuration = 0.55;

    CONFIG.moveDuration = 0.34;
    CONFIG.moveCounterTransferDuration = 0.28;
    CONFIG.moveCounterTickDuration = 0.11;
    CONFIG.moveCounterStepPause = 0.07;
    CONFIG.moveCounterZeroHoldDuration = 0.22;
    CONFIG.moveCounterFadeDuration = 0.18;
    CONFIG.moveLandingHoldDuration = 0.32;
    CONFIG.moveCounterBadgeSize = 48;
    CONFIG.moveCounterFontSize = 29;

    CONFIG.ingredientRevealDuration = 0.28;
    CONFIG.ingredientFlightDuration = 0.52;
    CONFIG.ingredientGlassBounceDuration = 0.20;
    CONFIG.ingredientGlassSettleDuration = 0.28;
    CONFIG.ingredientResultHoldDuration = 0.18;
    CONFIG.ingredientSourceLift = 28;
    CONFIG.flyingIngredientSize = 38;

    CONFIG.branchGaugeSpeed = 1.15;
    CONFIG.branchLockDuration = 0.42;
    CONFIG.branchPulseSpeed = 9;
    CONFIG.branchMarkerWidth = 5;

    CONFIG.pressureMin = 0;
    CONFIG.burstResetPressure = 3;
    CONFIG.pressureChangeDuration = 0.42;
    CONFIG.pressureResultHoldDuration = 0.20;
    CONFIG.pressureBubbleCount = 14;
    CONFIG.pressureEffectFontSize = 28;
    CONFIG.garnishRevealDuration = 0.36;
    CONFIG.garnishHoldDuration = 0.18;
    CONFIG.burstParticleCount = 30;
    CONFIG.burstDuration = 0.90;
    CONFIG.burstResultHoldDuration = 0.45;
    CONFIG.burstTokenFlightDuration = 0.75;
    CONFIG.glassWarningShake = 2;
    CONFIG.glassBurstShake = 7;

    CONFIG.eventRouletteMinStep = 0.05;
    CONFIG.eventRouletteStepGrowth = 0.012;
    CONFIG.eventRouletteCount = 10;
    CONFIG.eventResultHoldDuration = 0.45;
    CONFIG.eventWarningDuration = 0.35;
    CONFIG.eventFinishHoldDuration = 0.65;

    CONFIG.flipLiftDuration = 0.18;
    CONFIG.flipMoveDuration = 0.42;
    CONFIG.flipSettleDuration = 0.28;

    CONFIG.swapOutDuration = 0.22;
    CONFIG.swapCrossDuration = 0.38;
    CONFIG.swapInDuration = 0.22;

    CONFIG.spillShakeDuration = 0.22;
    CONFIG.spillMoveDuration = 0.50;

    CONFIG.mysteryRollCount = 8;
    CONFIG.mysteryRollStep = 0.09;
    CONFIG.mysteryRollStepGrowth = 0.018;
    CONFIG.mysteryResultHoldDuration = 0.58;
    CONFIG.mysteryIconSize = 62;

    CONFIG.glassFullWarningDuration = 0.42;
    CONFIG.capacitySpillDuration = 0.58;
    CONFIG.capacityIncomingSettleDuration = 0.34;
    CONFIG.capacitySpillDistance = 145;
    CONFIG.capacitySpillDrop = 52;

    CONFIG.goalRevealDuration = 0.42;
    CONFIG.goalHoldDuration = 0.62;
    CONFIG.goalFadeDuration = 0.36;
    CONFIG.resultRevealDuration = 0.48;
}


const CAP_SNAP_CONFIG = {
    pressDuration: 0.075,
    releaseDuration: 0.105,
    pullbackDistance: 9,
    releaseKick: 4,
};

const CAP_SLIDE_CONFIG = {
    minDuration: 0.30,
    maxDuration: 0.48,
    minSpeedRatio: 0.72,
    maxSpeedRatio: 0.96,
    friction: 0.89,
    boundaryBounce: 0.42,
    wobbleAmplitude: 0.012,
    wobbleFrequency: 36,
    finalJitter: 0.018,
    minVelocity: 0.018,
};

const CAP_DICE_CONFIG = {
    rollCyclesPerSecond: 17,
    crownScale: 1.35,
    landingYRatio: 0.66,
    overshootYRatio: 0.82,
    resultPulseSpeed: 11,
};

const CROWN_PHYSICS_CONFIG = {
    friction: 0.975,
    wallBounce: 0.56,
    wallSpinLoss: 0.72,
    launchStartRatio: 0.84,
    horizontalJitter: 0.13,
    aimDeadZone: 0.10,
    aimInfluence: 0.52,
    maxDirectionRatio: 0.68,
    minimumDuration: 0.42,
    maximumDuration: 2.40,
    stopSpeedRatio: 0.075,
    outerZoneEnd: 0.61,
    centerZoneEnd: 0.30,
    resultHoldDuration: 0.82,
    substeps: 3,
    trailLength: 9,
    trailInterval: 0.025,
    trailMinSpeedRatio: 0.13,
    trailFadeDuration: 0.34,
    wallFlashFade: 5.4,
    wallRingFade: 3.8,
    impactSparkCount: 7,
    stopRingDuration: 0.42,
    settleDuration: 0.18,
};


















function initGameState() {
    gameState = {
        phase: "TITLE",
        language: "ja",
        currentNodeId: "start",
        targetNodeId: null,
        remainingSteps: 0,
        moveTotal: 0,
        selectedRoutes: {},
        resolvedEvents: {},
        stirCount: 0,
        mysteryCount: 0,
        glassFullCount: 0,

        glass: {
            slots: [],
            pressure: 0,
            garnish: null,
            spilledTokens: [],
        },

        camera: {
            x: 0,
            y: 0,
            zoom: 1,
        },

        cap: {
            power: 0,
            powerDirection: 1,
            lockedPower: 0,
            distance: 1,
            isOverPower: false,
            x: 0,
            y: 0,
            rotation: 0,
        },

        branch: {
            activeNodeId: null,
            power: 0.5,
            powerDirection: 1,
            selectedIndex: 0,
            locked: false,
        },

        moveAnimation: {
            progress: 0,
        },

        moveCounter: {
            visible: false,
            displayValue: 0,
            x: 0,
            y: 0,
            scale: 0.72,
            alpha: 0,
        },

        landingPulse: 0,

        landingIngredientEffect: {
            visible: false,
            nodeId: null,
            ingredientId: null,
            pulse: 0,
            alpha: 0,
        },

        flyingIngredient: null,

        glassPulse: {
            scale: 1,
        },

        pressureEffect: {
            visible: false,
            text: "",
            x: 0,
            y: 0,
            scale: 0.6,
            alpha: 0,
            positive: true,
        },

        garnishEffect: {
            visible: false,
            scale: 1,
            alpha: 255,
        },

        carbonationParticles: [],
        burstState: null,
        burstToken: null,
        burstCount: 0,

        eventResultData: null,
        eventTarget1: null,
        eventTarget2: null,
        eventAnim: null,

        mystery: null,

        glassFullEffect: {
            visible: false,
            text: "",
            x: 0,
            y: 0,
            scale: 0.7,
            alpha: 0,
            ring: 0,
        },

        goalEffect: {
            visible: false,
            scale: 0.55,
            alpha: 0,
            ring: 0,
        },

        resultReveal: {
            scale: 0.94,
            alpha: 0,
        },

        resultData: null,

        nextTokenUid: 1,
    };
}










function updateLayout(force) {
  if (
    !force &&
    WIDTH === lastLayoutWidth &&
    HEIGHT === lastLayoutHeight
  ) {
    return;
  }

  lastLayoutWidth = WIDTH;
  lastLayoutHeight = HEIGHT;

  const portrait = HEIGHT > WIDTH;

  if (portrait) {
    const margin = 12;
    const lowerH = HEIGHT * 0.38;
    const capW =
      (WIDTH - margin * 3) *
      0.60;

    const glassW =
      WIDTH -
      capW -
      margin * 3;

    layout = {
      board: {
        x: margin,
        y: lowerH + margin * 2,
        w: WIDTH - margin * 2,
        h:
          HEIGHT -
          lowerH -
          margin * 3,
      },

      glass: {
        x: margin,
        y: margin,
        w: glassW,
        h: lowerH,
      },

      cap: {
        x:
          margin * 2 +
          glassW,
        y: margin,
        w: capW,
        h: lowerH,
      },
    };
  } else {
    layout = {
      board: {
        x: 20,
        y: HEIGHT * 0.35 + 10,
        w: WIDTH * 0.60,
        h: HEIGHT * 0.65 - 30,
      },

      cap: {
        x: 20,
        y: 20,
        w: WIDTH * 0.60,
        h: HEIGHT * 0.35 - 20,
      },

      glass: {
        x: WIDTH * 0.60 + 40,
        y: 20,
        w: WIDTH * 0.40 - 60,
        h: HEIGHT - 40,
      },
    };
  }

  CONFIG.mapWidth = WIDTH * 1.5;
  CONFIG.mapHeight = HEIGHT * 4.5;

  const start =
    BOARD_NODES[
      gameState.currentNodeId
    ];

  gameState.camera.x =
    start.nx *
    CONFIG.mapWidth;

  gameState.camera.y =
    start.ny *
      CONFIG.mapHeight +
    CONFIG.cameraLookAheadY;

  gameState.camera.zoom =
    portrait
      ? 0.86
      : 1.0;
}


function drawTitle() {
  drawLanguageButton();

  const cx = WIDTH * 0.5;
  const isJa = gameState.language === "ja";

  const mainTitle = "COLA ROLL";
  const subTitle = isJa ? "コーラすごろく" : "Craft Your Own Cola";
  const startText = isJa ? "画面をタップしてスタート" : "Tap anywhere to start";

  const titleY = HEIGHT * 0.18;
  const subTitleY = HEIGHT * 0.28;
  const capY = HEIGHT * 0.50;
  const startY = HEIGHT * 0.78;

  const bob = Math.sin(ElapsedTime * 2.4) * 6;
  const rot = Math.sin(ElapsedTime * 1.8) * 10;
  const ringSize = Math.min(WIDTH, HEIGHT) * 0.18;

  noStroke();
  fill(245, 238, 228, 220);
  fontSize(Math.min(24, WIDTH * 0.055));
  textAlign(CENTER);
  text(mainTitle, cx, titleY);

  fill(245, 238, 228);
  fontSize(Math.min(46, WIDTH * 0.092));
  text(subTitle, cx, subTitleY);

  noFill();
  stroke(220, 205, 190, 55);
  strokeWidth(2);
  ellipse(cx, capY + bob, ringSize + 24 + Math.sin(ElapsedTime * 3.1) * 8);
  stroke(220, 205, 190, 22);
  ellipse(cx, capY + bob, ringSize + 54 + Math.sin(ElapsedTime * 2.2) * 12);
  noStroke();

  fill(255, 255, 255, 18);
  ellipse(cx, capY + bob, ringSize, ringSize);

  drawCap(cx, capY + bob, rot, Math.min(70, WIDTH * 0.14));

  fill(245, 238, 228, 210 + Math.sin(ElapsedTime * 4) * 20);
  fontSize(Math.min(22, WIDTH * 0.05));
  text(startText, cx, startY);
}


function drawPreviewScreen() {
    drawBoardPanel();

    if (
        gameState.phase ===
            "WAIT_BRANCH_PREVIEW" ||
        gameState.phase ===
            "BRANCH_LOCKED"
    ) {
        drawBranchBoardOverlay();
        drawBranchPanel();
    } else {
        drawCapPanel();
    }

    drawGlassPanel();
    drawLandingIngredientSource();
    drawFlyingIngredient();
    drawBurstFlash();
    drawCarbonationParticles();
    drawBurstToken();
    drawSpilledTokens();
    drawPressureEffect();
    drawGlassFullMessage();
    drawMoveCounter();
    drawCapSnapEffect();
    drawLanguageButton();

    if (isEventRoulettePhase()) {
        drawEventRouletteOverlay();
    }

    if (isEventActionPhase()) {
        drawEventActionOverlay();
    }

    if (isMysteryPhase()) {
        drawMysteryOverlay();
    }

    if (
        gameState.phase ===
        "GOAL_ARRIVAL"
    ) {
        drawGoalArrivalOverlay();
    }
}

function drawCapSnapEffect() {
    const effect =
        gameState.capSnapEffect;

    if (
        !effect ||
        !effect.visible
    ) {
        return;
    }

    const cap =
        gameState.cap;

    const panel =
        layout.cap;

    const x =
        panel.x +
        cap.x;

    const y =
        panel.y +
        cap.y;

    const baseSize =
        Math.min(
            CONFIG.capSize,
            panel.h * 0.15
        );

    const ringSize =
        baseSize *
        (
            1.35 +
            effect.ring * 1.4
        );

    noFill();

    stroke(
        255,
        235,
        185,
        effect.alpha *
            0.78
    );

    strokeWidth(
        3 +
        effect.ring * 2
    );

    ellipse(
        x,
        y,
        ringSize
    );

    stroke(
        255,
        255,
        235,
        effect.alpha *
            0.34
    );

    strokeWidth(2);

    ellipse(
        x,
        y,
        ringSize * 1.28
    );

    const sparkRadius =
        baseSize * 0.72;

    const sparkLength =
        6 +
        effect.spark * 18;

    stroke(
        255,
        226,
        155,
        effect.alpha
    );

    strokeWidth(3);

    for (
        let index = 0;
        index < 8;
        index += 1
    ) {
        const angle =
            index *
            Math.PI /
            4;

        const innerX =
            x +
            Math.cos(angle) *
                sparkRadius;

        const innerY =
            y +
            Math.sin(angle) *
                sparkRadius;

        const outerX =
            x +
            Math.cos(angle) *
                (
                    sparkRadius +
                    sparkLength
                );

        const outerY =
            y +
            Math.sin(angle) *
                (
                    sparkRadius +
                    sparkLength
                );

        line(
            innerX,
            innerY,
            outerX,
            outerY
        );
    }

    noStroke();

    fill(
        255,
        245,
        205,
        effect.alpha *
            0.85
    );

    const flashSize =
        3 +
        effect.spark * 5;

    ellipse(
        x -
            baseSize * 0.62,
        y +
            baseSize * 0.48,
        flashSize
    );

    ellipse(
        x +
            baseSize * 0.66,
        y +
            baseSize * 0.30,
        flashSize * 0.72
    );
}



function drawGoalArrivalOverlay() {
    const effect =
        gameState.goalEffect;

    if (
        !effect ||
        !effect.visible
    ) {
        return;
    }

    fill(
        5,
        3,
        3,
        effect.alpha * 0.55
    );

    noStroke();

    rectMode(CORNER);

    rect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    const goalPosition =
        getBoardNodeScreenPosition(
            "goal"
        );

    const ringSize =
        46 +
        effect.ring * 74;

    noFill();

    stroke(
        255,
        220,
        125,
        effect.alpha
    );

    strokeWidth(4);

    ellipse(
        goalPosition.x,
        goalPosition.y,
        ringSize
    );

    stroke(
        255,
        245,
        205,
        effect.alpha * 0.45
    );

    strokeWidth(2);

    ellipse(
        goalPosition.x,
        goalPosition.y,
        ringSize * 1.42
    );

    noStroke();

    pushMatrix();

    translate(
        WIDTH * 0.5,
        HEIGHT * 0.54
    );

    scale(
        effect.scale,
        effect.scale
    );

    fill(
        255,
        226,
        145,
        effect.alpha
    );

    fontSize(
        Math.min(
            58,
            WIDTH * 0.15
        )
    );

    textAlign(CENTER);

    text(
        "GOAL!",
        0,
        0
    );

    fill(
        245,
        235,
        220,
        effect.alpha * 0.85
    );

    fontSize(
        Math.min(
            18,
            WIDTH * 0.046
        )
    );

    text(
        gameState.language === "ja"
            ? "コーラが完成しました"
            : "YOUR COLA IS COMPLETE",
        0,
        -56
    );

    popMatrix();
}

function drawResultScreen() {
    const reveal =
        gameState.resultReveal;

    const alpha =
        reveal
            ? reveal.alpha
            : 255;

    const scaleValue =
        reveal
            ? reveal.scale
            : 1;

    const portrait =
        HEIGHT > WIDTH;

    drawResultCardFrame(
        alpha
    );

    drawResultSparkles(
        alpha
    );

    pushMatrix();

    translate(
        WIDTH * 0.5,
        HEIGHT * 0.5
    );

    scale(
        scaleValue,
        scaleValue
    );

    translate(
        -WIDTH * 0.5,
        -HEIGHT * 0.5
    );

    const headerY =
        HEIGHT - 43;

    fill(
        232,
        167,
        73,
        alpha
    );

    noStroke();

    fontSize(
        Math.min(
            24,
            WIDTH * 0.061
        )
    );

    textAlign(CENTER);

    text(
        "COLA ROLL",
        WIDTH * 0.5,
        headerY
    );

    const headerLineW =
        Math.min(
            128,
            WIDTH * 0.28
        );

    stroke(
        174,
        101,
        45,
        alpha * 0.75
    );

    strokeWidth(2);

    line(
        WIDTH * 0.5 -
            headerLineW -
            30,
        headerY,
        WIDTH * 0.5 -
            30,
        headerY
    );

    line(
        WIDTH * 0.5 +
            30,
        headerY,
        WIDTH * 0.5 +
            headerLineW +
            30,
        headerY
    );

    noStroke();

    fill(
        232,
        167,
        73,
        alpha
    );

    rectMode(CENTER);

    pushMatrix();

    translate(
        WIDTH * 0.5 -
            18,
        headerY
    );

    rotate(45);

    rect(
        0,
        0,
        7,
        7
    );

    popMatrix();

    pushMatrix();

    translate(
        WIDTH * 0.5 +
            18,
        headerY
    );

    rotate(45);

    rect(
        0,
        0,
        7,
        7
    );

    popMatrix();

    let glassX;
    let glassY;
    let glassScale;
    let badgeX;
    let badgeY;
    let textX;
    let nameY;
    let descriptionY;
    let ingredientY;
    let metaY;
    let contentWidth;

    if (portrait) {
        glassX =
            WIDTH * 0.5;

        glassY =
            HEIGHT * 0.67;

        glassScale =
            Math.min(
                0.78,
                WIDTH / 225
            );

        badgeX =
            WIDTH * 0.5;

        badgeY =
            HEIGHT - 93;

        textX =
            WIDTH * 0.5;

        nameY =
            HEIGHT * 0.40;

        descriptionY =
            HEIGHT * 0.305;

        ingredientY =
            HEIGHT * 0.225;

        metaY =
            HEIGHT * 0.145;

        contentWidth =
            WIDTH - 54;
    } else {
        glassX =
            WIDTH * 0.29;

        glassY =
            HEIGHT * 0.51;

        glassScale =
            Math.min(
                0.82,
                HEIGHT / 390
            );

        badgeX =
            glassX;

        badgeY =
            HEIGHT - 88;

        textX =
            WIDTH * 0.70;

        nameY =
            HEIGHT * 0.62;

        descriptionY =
            HEIGHT * 0.44;

        ingredientY =
            HEIGHT * 0.31;

        metaY =
            HEIGHT * 0.22;

        contentWidth =
            WIDTH * 0.50;
    }

    const badgeText =
        getResultFizzBadgeText();

    const badgeW =
        Math.min(
            190,
            Math.max(
                112,
                badgeText.length *
                    21
            )
        );

    fill(
        58,
        24,
        17,
        alpha * 0.94
    );

    rectMode(CENTER);

    rect(
        badgeX,
        badgeY,
        badgeW,
        39,
        19
    );

    noFill();

    stroke(
        211,
        78,
        39,
        alpha
    );

    strokeWidth(2);

    rect(
        badgeX,
        badgeY,
        badgeW,
        39,
        19
    );

    noStroke();

    fill(
        230,
        91,
        48,
        alpha
    );

    fontSize(
        Math.min(
            21,
            WIDTH * 0.052
        )
    );

    text(
        badgeText,
        badgeX,
        badgeY
    );

    noFill();

    stroke(
        199,
        121,
        45,
        alpha * 0.18
    );

    strokeWidth(8);

    ellipse(
        glassX,
        glassY,
        185 *
            glassScale +
            Math.sin(
                ElapsedTime * 2.4
            ) *
            5
    );

    stroke(
        235,
        169,
        70,
        alpha * 0.32
    );

    strokeWidth(2);

    ellipse(
        glassX,
        glassY,
        205 *
            glassScale
    );

    noStroke();

    drawGlass(
        glassX,
        glassY,
        glassScale
    );

    drawGlassGarnishLocal(
        glassX,
        glassY,
        glassScale
    );

    drawResultGlassBubbles(
        glassX,
        glassY,
        glassScale,
        alpha
    );

    const resultName =
        generateResultName();

    const nameLines =
        splitResultName(
            resultName
        );

    const nameGap =
        portrait
            ? 27
            : 29;

    const nameStartY =
        nameY +
        (
            nameLines.length -
            1
        ) *
        nameGap *
        0.5;

    fill(
        255,
        225,
        165,
        alpha
    );

    fontSize(
        portrait
            ? Math.min(
                25,
                WIDTH * 0.064
            )
            : Math.min(
                30,
                WIDTH * 0.038
            )
    );

    textAlign(CENTER);

    for (
        let index = 0;
        index <
            nameLines.length;
        index += 1
    ) {
        text(
            nameLines[
                index
            ],
            textX,
            nameStartY -
                index *
                nameGap
        );
    }

    const descriptionLines =
        splitResultDescription(
            generateResultDescription(),
            portrait
                ? 23
                : 38
        );

    fill(
        220,
        202,
        180,
        alpha * 0.95
    );

    fontSize(
        portrait
            ? Math.min(
                14,
                WIDTH * 0.036
            )
            : Math.min(
                15,
                WIDTH * 0.020
            )
    );

    const descriptionGap =
        20;

    const descriptionStartY =
        descriptionY +
        (
            descriptionLines.length -
            1
        ) *
        descriptionGap *
        0.5;

    for (
        let index = 0;
        index <
            descriptionLines.length;
        index += 1
    ) {
        text(
            descriptionLines[
                index
            ],
            textX,
            descriptionStartY -
                index *
                descriptionGap
        );
    }

    drawResultIngredientRibbon(
        textX,
        ingredientY,
        contentWidth,
        alpha
    );

    drawResultMetaRow(
        textX,
        metaY,
        contentWidth,
        alpha
    );

    const button =
        getResultRestartButtonRect();

    fill(
        66,
        31,
        24,
        alpha
    );

    rectMode(CORNER);

    rect(
        button.x,
        button.y,
        button.w,
        button.h,
        11
    );

    noFill();

    stroke(
        185,
        95,
        52,
        alpha
    );

    strokeWidth(2);

    rect(
        button.x,
        button.y,
        button.w,
        button.h,
        11
    );

    noStroke();

    fill(
        244,
        198,
        133,
        alpha
    );

    fontSize(
        Math.min(
            16,
            WIDTH * 0.041
        )
    );

    text(
        gameState.language === "ja"
            ? "もう一杯つくる"
            : "MAKE ANOTHER",
        button.x +
            button.w * 0.5,
        button.y +
            button.h * 0.5
    );

    popMatrix();

    drawLanguageButton();
}

function splitResultDescription(
    value,
    maxLength
) {
    const textValue =
        String(
            value ||
            ""
        );

    if (
        textValue.length <=
        maxLength
    ) {
        return [
            textValue,
        ];
    }

    if (
        gameState.language ===
        "ja"
    ) {
        const first =
            textValue.slice(
                0,
                maxLength
            );

        const second =
            textValue.slice(
                maxLength
            );

        return [
            first,
            second,
        ];
    }

    const words =
        textValue.split(" ");

    const lines = [];
    let current = "";

    for (
        const word of words
    ) {
        const next =
            current === ""
                ? word
                : current +
                    " " +
                    word;

        if (
            next.length >
                maxLength &&
            current !== ""
        ) {
            lines.push(
                current
            );

            current =
                word;
        } else {
            current =
                next;
        }

        if (
            lines.length >= 1
        ) {
            break;
        }
    }

    if (
        current !== ""
    ) {
        lines.push(
            current
        );
    }

    return lines.slice(
        0,
        2
    );
}


function drawResultIngredientRibbon(
    centerX,
    y,
    width,
    alpha
) {
    const slots =
        gameState.glass.slots;

    fill(
        184,
        125,
        73,
        alpha * 0.85
    );

    noStroke();

    fontSize(
        Math.min(
            11,
            WIDTH * 0.029
        )
    );

    textAlign(CENTER);

    text(
        gameState.language === "ja"
            ? "できあがった材料"
            : "FINAL INGREDIENTS",
        centerX,
        y + 30
    );

    if (
        slots.length === 0
    ) {
        fill(
            220,
            200,
            180,
            alpha * 0.7
        );

        fontSize(13);

        text(
            gameState.language === "ja"
                ? "空っぽ"
                : "EMPTY",
            centerX,
            y
        );

        return;
    }

    const gap =
        Math.min(
            48,
            width /
                Math.max(
                    1,
                    slots.length
                )
        );

    const startX =
        centerX -
        gap *
            (
                slots.length -
                1
            ) *
            0.5;

    for (
        let index = 0;
        index <
            slots.length;
        index += 1
    ) {
        const token =
            slots[index];

        const ingredient =
            INGREDIENTS[
                token.ingredientId
            ];

        if (!ingredient) {
            continue;
        }

        const x =
            startX +
            gap *
            index;

        fill(
            ingredient.color.r,
            ingredient.color.g,
            ingredient.color.b,
            alpha * 0.45
        );

        ellipse(
            x,
            y,
            34
        );

        noFill();

        stroke(
            247,
            220,
            175,
            alpha * 0.65
        );

        strokeWidth(
            index ===
            slots.length - 1
                ? 3
                : 1.5
        );

        ellipse(
            x,
            y,
            index ===
            slots.length - 1
                ? 38
                : 34
        );

        noStroke();

        drawIngredientIcon(
            token.ingredientId,
            x,
            y,
            17,
            alpha
        );
    }
}


function drawResultMetaRow(
    centerX,
    y,
    width,
    alpha
) {
    const result =
        gameState.resultData;

    if (!result) {
        return;
    }

    const itemWidth =
        width / 3;

    const labels = [
        "ROUTE: " +
            getResultRouteLabel(),

        "SPILL: " +
            String(
                result.spilledCount
            ),

        "BURST: " +
            String(
                result.burstCount
            ),
    ];

    stroke(
        150,
        84,
        40,
        alpha * 0.55
    );

    strokeWidth(1);

    line(
        centerX -
            width * 0.5,
        y + 25,
        centerX +
            width * 0.5,
        y + 25
    );

    line(
        centerX -
            width * 0.5,
        y - 25,
        centerX +
            width * 0.5,
        y - 25
    );

    line(
        centerX -
            itemWidth * 0.5,
        y - 17,
        centerX -
            itemWidth * 0.5,
        y + 17
    );

    line(
        centerX +
            itemWidth * 0.5,
        y - 17,
        centerX +
            itemWidth * 0.5,
        y + 17
    );

    noStroke();

    for (
        let index = 0;
        index < 3;
        index += 1
    ) {
        const x =
            centerX -
            width * 0.5 +
            itemWidth *
                (
                    index +
                    0.5
                );

        fill(
            index === 0
                ? 220
                : 236,
            index === 0
                ? 91
                : 171,
            index === 0
                ? 50
                : 88,
            alpha
        );

        fontSize(
            Math.min(
                13,
                width /
                    24
            )
        );

        textAlign(CENTER);

        text(
            labels[
                index
            ],
            x,
            y
        );
    }
}


function getResultRouteLabel() {
    const result =
        gameState.resultData;

    if (
        !result ||
        !result.routeFinal
    ) {
        return "-";
    }

    const route =
        String(
            result.routeFinal
        ).toUpperCase();

    return route;
}


function getResultFizzBadgeText() {
    const result =
        gameState.resultData;

    if (!result) {
        return gameState.language === "ja"
            ? "完成"
            : "COMPLETE";
    }

    if (
        result.burstCount > 0 ||
        result.pressure >=
            CONFIG.pressureMax
    ) {
        return gameState.language === "ja"
            ? "限界炭酸"
            : "LIMIT FIZZ";
    }

    if (
        result.pressure >= 3
    ) {
        return gameState.language === "ja"
            ? "強炭酸"
            : "EXTRA FIZZ";
    }

    if (
        result.pressure >= 1
    ) {
        return gameState.language === "ja"
            ? "炭酸仕立て"
            : "FIZZY";
    }

    return gameState.language === "ja"
        ? "おだやか炭酸"
        : "SOFT FIZZ";
}


function drawResultSparkles(alpha) {
    noStroke();

    for (
        let index = 0;
        index < 28;
        index += 1
    ) {
        const x =
            25 +
            (
                (
                    index *
                    97
                ) %
                100
            ) /
            100 *
            (
                WIDTH -
                50
            );

        const y =
            35 +
            (
                (
                    index *
                    61 +
                    17
                ) %
                100
            ) /
            100 *
            (
                HEIGHT -
                70
            );

        const pulse =
            0.45 +
            Math.sin(
                ElapsedTime *
                    2.2 +
                index *
                    1.7
            ) *
            0.22;

        fill(
            index % 3 === 0
                ? 220
                : 145,
            index % 3 === 0
                ? 120
                : 75,
            index % 3 === 0
                ? 45
                : 30,
            alpha *
                pulse
        );

        if (
            index % 5 === 0
        ) {
            pushMatrix();

            translate(
                x,
                y
            );

            rotate(45);

            rectMode(CENTER);

            rect(
                0,
                0,
                5,
                5
            );

            popMatrix();
        } else {
            ellipse(
                x,
                y,
                2 +
                    index % 3
            );
        }
    }
}


function drawResultCornerMark(
    x,
    y,
    directionX,
    directionY,
    alpha
) {
    pushMatrix();

    translate(
        x,
        y
    );

    scale(
        directionX,
        directionY
    );

    noFill();

    stroke(
        193,
        70,
        35,
        alpha * 0.85
    );

    strokeWidth(2);

    line(
        0,
        0,
        24,
        0
    );

    line(
        0,
        0,
        0,
        24
    );

    line(
        5,
        5,
        18,
        5
    );

    line(
        5,
        5,
        5,
        18
    );

    line(
        11,
        5,
        11,
        12
    );

    line(
        5,
        11,
        12,
        11
    );

    noStroke();

    popMatrix();
}


function drawResultCardFrame(alpha) {
    fill(
        20,
        10,
        7
    );

    noStroke();

    rectMode(CORNER);

    rect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    const margin =
        14;

    fill(
        35,
        18,
        12,
        alpha
    );

    rect(
        margin,
        margin,
        WIDTH -
            margin * 2,
        HEIGHT -
            margin * 2,
        14
    );

    noFill();

    stroke(
        116,
        66,
        31,
        alpha * 0.95
    );

    strokeWidth(2);

    rect(
        margin,
        margin,
        WIDTH -
            margin * 2,
        HEIGHT -
            margin * 2,
        14
    );

    stroke(
        171,
        102,
        42,
        alpha * 0.36
    );

    strokeWidth(1);

    rect(
        margin + 7,
        margin + 7,
        WIDTH -
            margin * 2 -
            14,
        HEIGHT -
            margin * 2 -
            14,
        10
    );

    noStroke();

    drawResultCornerMark(
        margin + 11,
        margin + 11,
        1,
        1,
        alpha
    );

    drawResultCornerMark(
        WIDTH -
            margin -
            11,
        margin + 11,
        -1,
        1,
        alpha
    );

    drawResultCornerMark(
        margin + 11,
        HEIGHT -
            margin -
            11,
        1,
        -1,
        alpha
    );

    drawResultCornerMark(
        WIDTH -
            margin -
            11,
        HEIGHT -
            margin -
            11,
        -1,
        -1,
        alpha
    );
}



function splitResultName(name) {
    if (
        gameState.language === "ja"
    ) {
        if (name.length <= 13) {
            return [
                name,
            ];
        }

        const suffixes = [
            "限界炭酸コーラ",
            "強炭酸コーラ",
            "コーラ",
        ];

        for (
            const suffix of
            suffixes
        ) {
            if (
                name.endsWith(
                    suffix
                )
            ) {
                const prefix =
                    name.slice(
                        0,
                        name.length -
                            suffix.length
                    );

                if (
                    prefix.length <= 13
                ) {
                    return [
                        prefix,
                        suffix,
                    ];
                }

                const middle =
                    Math.ceil(
                        prefix.length *
                        0.5
                    );

                return [
                    prefix.slice(
                        0,
                        middle
                    ),

                    prefix.slice(
                        middle
                    ),

                    suffix,
                ];
            }
        }

        const middle =
            Math.ceil(
                name.length *
                0.5
            );

        return [
            name.slice(
                0,
                middle
            ),

            name.slice(
                middle
            ),
        ];
    }

    if (name.length <= 24) {
        return [
            name,
        ];
    }

    const words =
        name.split(" ");

    const lines = [
        "",
        "",
    ];

    for (
        const word of words
    ) {
        const targetIndex =
            lines[0].length <=
            lines[1].length
                ? 0
                : 1;

        lines[
            targetIndex
        ] +=
            (
                lines[
                    targetIndex
                ] === ""
                    ? ""
                    : " "
            ) +
            word;
    }

    return lines;
}


function drawResultGlassBubbles(
    glassX,
    glassY,
    glassScale,
    alpha
) {
    const pressure =
        gameState.glass.pressure;

    if (pressure <= 0) {
        return;
    }

    const count =
        pressure * 5;

    pushMatrix();

    translate(
        glassX,
        glassY
    );

    scale(
        glassScale,
        glassScale
    );

    noFill();

    stroke(
        210,
        245,
        255,
        alpha * 0.55
    );

    strokeWidth(2);

    for (
        let index = 0;
        index < count;
        index += 1
    ) {
        const bubbleX =
            Math.sin(
                index * 12.7
            ) *
            42;

        const travel =
            (
                ElapsedTime * 25 +
                index * 29
            ) %
            180;

        const bubbleY =
            -88 +
            travel;

        const bubbleSize =
            3 +
            (
                index % 4
            ) *
            1.4;

        ellipse(
            bubbleX,
            bubbleY,
            bubbleSize
        );
    }

    noStroke();

    popMatrix();
}






function drawGlassFullMessage() {
    const effect =
        gameState.glassFullEffect;

    if (
        !effect ||
        !effect.visible
    ) {
        return;
    }

    const topPosition =
        getGlassSlotScreenPosition(
            CONFIG.glassCapacity - 1
        );

    const ringSize =
        42 +
        effect.ring * 24;

    noFill();

    stroke(
        255,
        218,
        145,
        effect.alpha * 0.75
    );

    strokeWidth(3);

    ellipse(
        topPosition.x,
        topPosition.y,
        ringSize
    );

    stroke(
        255,
        238,
        195,
        effect.alpha * 0.35
    );

    strokeWidth(2);

    ellipse(
        topPosition.x,
        topPosition.y,
        ringSize * 1.35
    );

    noStroke();

    pushMatrix();

    translate(
        effect.x,
        effect.y
    );

    scale(
        effect.scale,
        effect.scale
    );

    const boxW =
        Math.min(
            180,
            WIDTH * 0.46
        );

    const boxH = 38;

    fill(
        18,
        13,
        13,
        effect.alpha * 0.88
    );

    rectMode(CENTER);

    rect(
        0,
        0,
        boxW,
        boxH,
        10
    );

    noFill();

    stroke(
        255,
        215,
        140,
        effect.alpha
    );

    strokeWidth(2);

    rect(
        0,
        0,
        boxW,
        boxH,
        10
    );

    noStroke();

    fill(
        255,
        238,
        205,
        effect.alpha
    );

    fontSize(
        Math.min(
            15,
            WIDTH * 0.038
        )
    );

    textAlign(CENTER);

    text(
        effect.text,
        0,
        0
    );

    rectMode(CORNER);

    popMatrix();
}



function isMysteryPhase() {
    return (
        gameState.phase ===
            "MYSTERY_ROLLING" ||
        gameState.phase ===
            "MYSTERY_RESULT"
    );
}

function drawMysteryOverlay() {
    const mystery =
        gameState.mystery;

    if (
        !mystery ||
        !mystery.visible ||
        !mystery.ingredientId
    ) {
        return;
    }

    const ingredient =
        INGREDIENTS[
            mystery.ingredientId
        ];

    if (!ingredient) {
        return;
    }

    fill(
        10,
        6,
        14,
        205
    );

    noStroke();

    rectMode(CORNER);

    rect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    const centerX =
        WIDTH * 0.5;

    const centerY =
        HEIGHT * 0.52;

    const rolling =
        gameState.phase ===
        "MYSTERY_ROLLING";

    const pulse =
        rolling
            ? 1 +
                Math.sin(
                    ElapsedTime * 20
                ) *
                    0.07
            : 1 +
                Math.sin(
                    ElapsedTime * 7
                ) *
                    0.035;

    pushMatrix();

    translate(
        centerX,
        centerY
    );

    scale(
        mystery.scale *
            pulse,
        mystery.scale *
            pulse
    );

    rotate(
        mystery.ringRotation
    );

    noFill();

    stroke(
        210,
        170,
        225,
        rolling
            ? 145
            : 235
    );

    strokeWidth(
        rolling
            ? 3
            : 5
    );

    for (
        let index = 0;
        index < 8;
        index += 1
    ) {
        pushMatrix();

        rotate(
            index * 45
        );

        line(
            0,
            45,
            0,
            rolling
                ? 58
                : 65
        );

        popMatrix();
    }

    noStroke();

    popMatrix();

    fill(
        ingredient.color.r,
        ingredient.color.g,
        ingredient.color.b,
        rolling
            ? 175
            : 235
    );

    ellipse(
        centerX,
        centerY,
        CONFIG.mysteryIconSize +
            (
                rolling
                    ? 10
                    : 22
            )
    );

    noFill();

    stroke(
        255,
        240,
        215,
        rolling
            ? 145
            : 255
    );

    strokeWidth(
        rolling
            ? 2
            : 4
    );

    ellipse(
        centerX,
        centerY,
        CONFIG.mysteryIconSize +
            (
                rolling
                    ? 2
                    : 14
            )
    );

    noStroke();

    drawIngredientIcon(
        mystery.ingredientId,
        centerX,
        centerY,
        CONFIG.mysteryIconSize *
            0.58,
        255
    );

    fill(
        225,
        185,
        235,
        rolling
            ? 210
            : 255
    );

    fontSize(
        Math.min(
            44,
            WIDTH * 0.11
        )
    );

    textAlign(CENTER);

    text(
        "?",
        centerX,
        centerY + 92
    );

    if (rolling) {
        fill(
            225,
            215,
            225,
            180
        );

        fontSize(
            Math.min(
                17,
                WIDTH * 0.043
            )
        );

        text(
            gameState.language === "ja"
                ? "なにが入る？"
                : "WHAT WILL IT BE?",
            centerX,
            centerY - 92
        );

        return;
    }

    fill(
        255,
        238,
        190,
        255
    );

    fontSize(
        Math.min(
            28,
            WIDTH * 0.068
        )
    );

    text(
        ingredient[
            gameState.language
        ],
        centerX,
        centerY - 91
    );

    fill(
        225,
        215,
        205,
        210
    );

    fontSize(
        Math.min(
            16,
            WIDTH * 0.041
        )
    );

    text(
        gameState.language === "ja"
            ? "ミステリー材料を獲得"
            : "MYSTERY INGREDIENT",
        centerX,
        centerY - 124
    );
}




function isEventRoulettePhase() {
    return (
        gameState.phase ===
            "WAIT_EVENT_ROLL" ||
        gameState.phase ===
            "EVENT_ROLLING" ||
        gameState.phase ===
            "SHOWING_EVENT_RESULT"
    );
}

function isEventActionPhase() {
    return (
        gameState.phase ===
            "EVENT_WARNING" ||
        gameState.phase ===
            "ANIMATING_EVENT" ||
        gameState.phase ===
            "EVENT_FINISHED"
    );
}

function drawEventRouletteOverlay() {
    fill(0, 0, 0, 190);
    noStroke();

    rectMode(CORNER);

    rect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    const centerX =
        WIDTH * 0.5;

    const centerY =
        HEIGHT * 0.52;

    if (
        gameState.phase ===
        "WAIT_EVENT_ROLL"
    ) {
        const bob =
            Math.sin(
                ElapsedTime * 5
            ) *
            5;

        drawEventIcon(
            "flip",
            centerX - 78,
            centerY + bob,
            42,
            110
        );

        drawEventIcon(
            "swap",
            centerX,
            centerY + bob,
            42,
            110
        );

        drawEventIcon(
            "spill",
            centerX + 78,
            centerY + bob,
            42,
            110
        );

        noFill();

        stroke(
            255,
            235,
            190,
            150 +
                Math.sin(
                    ElapsedTime * 8
                ) *
                    70
        );

        strokeWidth(3);

        ellipse(
            centerX,
            centerY - 86,
            76
        );

        noStroke();

        drawEventIcon(
            "swap",
            centerX,
            centerY - 86,
            54,
            255
        );

        fill(
            255,
            240,
            210,
            230
        );

        fontSize(
            Math.min(
                21,
                WIDTH * 0.052
            )
        );

        textAlign(CENTER);

        text(
            gameState.language === "ja"
                ? "タップでステア"
                : "TAP TO STIR",
            centerX,
            centerY - 142
        );

        return;
    }

    if (
        !gameState.eventResultData
    ) {
        return;
    }

    const eventId =
        gameState.eventResultData.id;

    const rolling =
        gameState.phase ===
        "EVENT_ROLLING";

    const iconSize =
        rolling
            ? 74 +
                Math.sin(
                    ElapsedTime * 22
                ) *
                    7
            : 112;

    drawEventIcon(
        eventId,
        centerX,
        centerY,
        iconSize,
        255
    );

    if (!rolling) {
        const display =
            getEventDisplayText(
                eventId
            );

        fill(
            255,
            235,
            185,
            255
        );

        noStroke();

        fontSize(
            Math.min(
                31,
                WIDTH * 0.075
            )
        );

        textAlign(CENTER);

        text(
            display.title,
            centerX,
            centerY - 92
        );

        fill(
            225,
            215,
            205,
            210
        );

        fontSize(
            Math.min(
                17,
                WIDTH * 0.043
            )
        );

        text(
            display.description,
            centerX,
            centerY - 126
        );
    }
}

function drawEventActionOverlay() {
    const eventAnim =
        gameState.eventAnim;

    if (!eventAnim) {
        return;
    }

    fill(
        0,
        0,
        0,
        eventAnim.panelMaskAlpha
    );

    noStroke();

    rectMode(CORNER);

    rect(
        layout.board.x,
        layout.board.y,
        layout.board.w,
        layout.board.h
    );

    rect(
        layout.cap.x,
        layout.cap.y,
        layout.cap.w,
        layout.cap.h
    );

    if (
        gameState.eventResultData
    ) {
        drawEventIcon(
            gameState.eventResultData.id,
            eventAnim.iconX,
            eventAnim.iconY,
            eventAnim.iconSize,
            eventAnim.iconAlpha
        );
    }
}

function getEventDisplayText(eventId) {
    if (eventId === "flip") {
        return {
            title: "FLIP",
            description:
                gameState.language === "ja"
                    ? "グラスの順番が逆になる"
                    : "REVERSE THE GLASS",
        };
    }

    if (eventId === "swap") {
        return {
            title: "SWAP",
            description:
                gameState.language === "ja"
                    ? "となりの材料を入れ替える"
                    : "SWAP TWO INGREDIENTS",
        };
    }

    return {
        title: "SPILL",
        description:
            gameState.language === "ja"
                ? "一番上の材料がこぼれる"
                : "SPILL THE TOP INGREDIENT",
    };
}







function drawPressureEffect() {
    const effect =
        gameState.pressureEffect;

    if (
        !effect ||
        !effect.visible
    ) {
        return;
    }

    pushMatrix();

    translate(
        effect.x,
        effect.y
    );

    scale(
        effect.scale,
        effect.scale
    );

    if (effect.positive) {
        fill(
            145,
            225,
            255,
            effect.alpha
        );
    } else {
        fill(
            170,
            205,
            225,
            effect.alpha
        );
    }

    noStroke();

    fontSize(
        CONFIG.pressureEffectFontSize
    );

    textAlign(CENTER);

    text(
        effect.text,
        0,
        0
    );

    popMatrix();
}

function drawCarbonationParticles() {
    noStroke();

    for (
        const particle of
        gameState.carbonationParticles
    ) {
        const ratio =
            Math.max(
                0,
                particle.life /
                    particle.maxLife
            );

        if (particle.burst) {
            fill(
                215,
                245,
                255,
                ratio * 230
            );
        } else {
            fill(
                220,
                248,
                255,
                ratio * 150
            );
        }

        ellipse(
            particle.x,
            particle.y,
            particle.size *
                (
                    0.65 +
                    ratio * 0.55
                )
        );
    }
}

function drawBurstFlash() {
    const burst =
        gameState.burstState;

    if (!burst) {
        return;
    }

    const geometry =
        getGlassScreenGeometry();

    const pulse =
        1 +
        Math.sin(
            ElapsedTime * 20
        ) *
            0.08;

    noFill();

    stroke(
        220,
        248,
        255,
        burst.flash * 220
    );

    strokeWidth(
        3 +
        burst.flash * 5
    );

    ellipse(
        geometry.centerX,
        geometry.centerY,
        geometry.topW *
            geometry.scale *
            1.55 *
            pulse
    );

    stroke(
        255,
        245,
        220,
        burst.flash * 120
    );

    strokeWidth(2);

    ellipse(
        geometry.centerX,
        geometry.centerY,
        geometry.topW *
            geometry.scale *
            2.1 *
            pulse
    );

    noStroke();
}

function drawBurstToken() {
    const token =
        gameState.burstToken;

    if (!token) {
        return;
    }

    const ingredient =
        INGREDIENTS[
            token.ingredientId
        ];

    if (!ingredient) {
        return;
    }

    pushMatrix();

    translate(
        token.x,
        token.y
    );

    rotate(
        token.rotation
    );

    scale(
        token.scale,
        token.scale
    );

    fill(
        ingredient.color.r,
        ingredient.color.g,
        ingredient.color.b,
        token.alpha
    );

    noStroke();

    rectMode(CENTER);

    rect(
        0,
        0,
        42,
        18,
        4
    );

    drawIngredientIcon(
        token.ingredientId,
        0,
        0,
        15,
        token.alpha
    );

    rectMode(CORNER);

    popMatrix();
}

function drawSpilledTokens() {
    const tokens =
        gameState.glass.spilledTokens;

    if (
        !tokens ||
        tokens.length === 0
    ) {
        return;
    }

    const panel =
        layout.glass;

    const startIndex =
        Math.max(
            0,
            tokens.length - 3
        );

    for (
        let index = startIndex;
        index < tokens.length;
        index += 1
    ) {
        const token =
            tokens[index];

        const offset =
            index -
            startIndex;

        const x =
            panel.x +
            panel.w -
            18 -
            offset * 8;

        const y =
            panel.y +
            22 +
            offset * 15;

        pushMatrix();

        translate(
            x,
            y
        );

        rotate(
            35 +
            index * 18
        );

        fill(
            INGREDIENTS[
                token.ingredientId
            ].color
        );

        rectMode(CENTER);

        rect(
            0,
            0,
            24,
            9,
            2
        );

        drawIngredientIcon(
            token.ingredientId,
            0,
            0,
            9,
            255
        );

        rectMode(CORNER);

        popMatrix();
    }
}








function drawLandingIngredientSource() {
    const effect =
        gameState.landingIngredientEffect;

    if (
        !effect ||
        !effect.visible ||
        !effect.ingredientId
    ) {
        return;
    }

    const position =
        getBoardNodeScreenPosition(
            effect.nodeId
        );

    const ingredient =
        INGREDIENTS[
            effect.ingredientId
        ];

    if (!ingredient) {
        return;
    }

    const pulseSize =
        38 +
        effect.pulse * 26;

    noFill();

    stroke(
        ingredient.color.r,
        ingredient.color.g,
        ingredient.color.b,
        effect.alpha * 0.55
    );

    strokeWidth(3);

    ellipse(
        position.x,
        position.y,
        pulseSize
    );

    stroke(
        255,
        240,
        205,
        effect.alpha * 0.35
    );

    strokeWidth(2);

    ellipse(
        position.x,
        position.y,
        pulseSize * 1.35
    );

    noStroke();

    drawIngredientIcon(
        effect.ingredientId,
        position.x,
        position.y,
        25 +
            effect.pulse * 5,
        effect.alpha
    );
}

function drawFlyingIngredient() {
    const flying =
        gameState.flyingIngredient;

    if (
        !flying ||
        !flying.ingredientId
    ) {
        return;
    }

    const ingredient =
        INGREDIENTS[
            flying.ingredientId
        ];

    if (!ingredient) {
        return;
    }

    pushMatrix();

    translate(
        flying.x,
        flying.y
    );

    rotate(
        flying.rotation
    );

    scale(
        flying.scale,
        flying.scale
    );

    noStroke();

    fill(
        15,
        12,
        12,
        flying.alpha * 0.32
    );

    ellipse(
        4,
        -4,
        CONFIG.flyingIngredientSize +
            12
    );

    fill(
        ingredient.color.r,
        ingredient.color.g,
        ingredient.color.b,
        flying.alpha * 0.36
    );

    ellipse(
        0,
        0,
        CONFIG.flyingIngredientSize +
            8
    );

    noFill();

    stroke(
        255,
        240,
        215,
        flying.alpha * 0.75
    );

    strokeWidth(2);

    ellipse(
        0,
        0,
        CONFIG.flyingIngredientSize
    );

    noStroke();

    drawIngredientIcon(
        flying.ingredientId,
        0,
        0,
        CONFIG.flyingIngredientSize *
            0.62,
        flying.alpha
    );

    popMatrix();
}




function drawMoveCounter() {
    const counter =
        gameState.moveCounter;

    if (
        !counter ||
        !counter.visible
    ) {
        return;
    }

    pushMatrix();
    translate(
        counter.x,
        counter.y
    );

    scale(
        counter.scale,
        counter.scale
    );

    const size =
        CONFIG.moveCounterBadgeSize;

    const radius =
        size / 2;

    noStroke();
    fill(
        15,
        12,
        12,
        counter.alpha * 0.35
    );

    ellipse(
        4,
        -4,
        size + 8
    );

    fill(
        178,
        160,
        142,
        counter.alpha
    );

    for (
        let index = 0;
        index < 12;
        index += 1
    ) {
        pushMatrix();
        rotate(index * 30);

        ellipse(
            0,
            radius,
            Math.max(
                5,
                size * 0.15
            )
        );

        popMatrix();
    }

    fill(
        205,
        185,
        165,
        counter.alpha
    );

    ellipse(
        0,
        0,
        size
    );

    fill(
        152,
        52,
        48,
        counter.alpha
    );

    ellipse(
        0,
        0,
        size * 0.66
    );

    fill(
        255,
        245,
        225,
        counter.alpha
    );

    fontSize(
        CONFIG.moveCounterFontSize
    );

    textAlign(CENTER);

    text(
        String(
            counter.displayValue
        ),
        0,
        0
    );

    popMatrix();
}



function drawLanguageButton() {
    const button =
        getLanguageButtonRect();

    const resultScreen =
        gameState.phase === "RESULT";

    if (resultScreen) {
        fill(
            44,
            22,
            17,
            225
        );
    } else {
        fill(
            32,
            27,
            27,
            210
        );
    }

    noStroke();

    rectMode(CORNER);

    rect(
        button.x,
        button.y,
        button.w,
        button.h,
        9
    );

    noFill();

    if (resultScreen) {
        stroke(
            185,
            95,
            52,
            210
        );
    } else {
        stroke(
            132,
            108,
            96,
            180
        );
    }

    strokeWidth(1.5);

    rect(
        button.x,
        button.y,
        button.w,
        button.h,
        9
    );

    noStroke();

    if (resultScreen) {
        fill(
            244,
            198,
            133,
            235
        );
    } else {
        fill(
            230,
            220,
            210,
            225
        );
    }

    fontSize(13);
    textAlign(CENTER);

    text(
        TEXT[
            gameState.language
        ].langButton,
        button.x +
            button.w * 0.5,
        button.y +
            button.h * 0.5
    );
}


function drawPanelFrame(panel) {
  noStroke();

  fill(10, 8, 8, 80);

  rect(
    panel.x + 5,
    panel.y - 5,
    panel.w,
    panel.h,
    16,
  );

  fill(40, 34, 34);

  rect(
    panel.x,
    panel.y,
    panel.w,
    panel.h,
    16,
  );

  noFill();
  stroke(108, 85, 78, 210);
  strokeWidth(2);

  rect(
    panel.x,
    panel.y,
    panel.w,
    panel.h,
    16,
  );

  noStroke();
}

function drawBoardPanel() {
    const panel = layout.board;

    drawPanelFrame(panel);

    clip(
        panel.x,
        panel.y,
        panel.w,
        panel.h
    );

    pushMatrix();
    translate(
        panel.x,
        panel.y
    );

    const centerX =
        panel.w * 0.50;

    const centerY =
        panel.h * 0.28;

    const worldToBoardPoint = function(
        worldX,
        worldY
    ) {
        return {
            x:
                (worldX -
                    gameState.camera.x) *
                    gameState.camera.zoom +
                centerX,

            y:
                (worldY -
                    gameState.camera.y) *
                    gameState.camera.zoom +
                centerY,
        };
    };

    const worldToBoardNode = function(node) {
        return worldToBoardPoint(
            node.nx * CONFIG.mapWidth,
            node.ny * CONFIG.mapHeight
        );
    };

    const distanceMap = {};

    if (
        gameState.phase ===
        "WAIT_CAP_POWER"
    ) {
        const traverse = function(
            nodeId,
            distance
        ) {
            if (
                !nodeId ||
                distance > 3
            ) {
                return;
            }

            const node =
                BOARD_NODES[nodeId];

            if (!node) {
                return;
            }

            if (
                distanceMap[nodeId] === undefined ||
                distance <
                    distanceMap[nodeId]
            ) {
                distanceMap[nodeId] =
                    distance;
            }

            if (node.next) {
                traverse(
                    node.next,
                    distance + 1
                );
            } else if (node.choices) {
                for (
                    const choice of
                    node.choices
                ) {
                    traverse(
                        choice.next,
                        distance + 1
                    );
                }
            }
        };

        const currentNode =
            BOARD_NODES[
                gameState.currentNodeId
            ];

        if (currentNode) {
            if (currentNode.next) {
                traverse(
                    currentNode.next,
                    1
                );
            } else if (
                currentNode.choices
            ) {
                for (
                    const choice of
                    currentNode.choices
                ) {
                    traverse(
                        choice.next,
                        1
                    );
                }
            }
        }
    }

    for (
        const node of
        Object.values(BOARD_NODES)
    ) {
        const point1 =
            worldToBoardNode(node);

        if (node.next) {
            const nextNode =
                BOARD_NODES[node.next];

            if (nextNode) {
                const point2 =
                    worldToBoardNode(
                        nextNode
                    );

                if (
                    segmentNearPanel(
                        point1,
                        point2,
                        panel.w,
                        panel.h
                    )
                ) {
                    stroke(
                        108,
                        103,
                        99,
                        210
                    );

                    strokeWidth(3);

                    line(
                        point1.x,
                        point1.y,
                        point2.x,
                        point2.y
                    );
                }
            }
        }

        if (node.choices) {
            for (
                const choice of
                node.choices
            ) {
                const nextNode =
                    BOARD_NODES[
                        choice.next
                    ];

                if (!nextNode) {
                    continue;
                }

                const point2 =
                    worldToBoardNode(
                        nextNode
                    );

                if (
                    segmentNearPanel(
                        point1,
                        point2,
                        panel.w,
                        panel.h
                    )
                ) {
                    stroke(
                        108,
                        103,
                        99,
                        210
                    );

                    strokeWidth(3);

                    line(
                        point1.x,
                        point1.y,
                        point2.x,
                        point2.y
                    );
                }
            }
        }
    }

    noStroke();

    for (
        const node of
        Object.values(BOARD_NODES)
    ) {
        const point =
            worldToBoardNode(node);

        if (
            point.x < -25 ||
            point.x >
                panel.w + 25 ||
            point.y < -25 ||
            point.y >
                panel.h + 25
        ) {
            continue;
        }

        fill(
            126,
            117,
            111
        );

        ellipse(
            point.x,
            point.y,
            CONFIG.nodeSize
        );

        drawNodeIcon(
            node,
            point.x,
            point.y,
            14,
            255
        );

        if (
            distanceMap[node.id] !==
            undefined
        ) {
            fill(
                255,
                232,
                155,
                255
            );

            fontSize(17);
            textAlign(CENTER);

            text(
                String(
                    distanceMap[
                        node.id
                    ]
                ),
                point.x,
                point.y + 20
            );
        }
    }

    const currentNode =
        BOARD_NODES[
            gameState.currentNodeId
        ];

    if (currentNode) {
        let tokenWorldX =
            currentNode.nx *
            CONFIG.mapWidth;

        let tokenWorldY =
            currentNode.ny *
            CONFIG.mapHeight;

        if (
            gameState.targetNodeId &&
            gameState.moveAnimation
        ) {
            const targetNode =
                BOARD_NODES[
                    gameState.targetNodeId
                ];

            if (targetNode) {
                const progress =
                    gameState.moveAnimation
                        .progress;

                const targetWorldX =
                    targetNode.nx *
                    CONFIG.mapWidth;

                const targetWorldY =
                    targetNode.ny *
                    CONFIG.mapHeight;

                tokenWorldX +=
                    (targetWorldX -
                        tokenWorldX) *
                    progress;

                tokenWorldY +=
                    (targetWorldY -
                        tokenWorldY) *
                    progress;
            }
        }

        const tokenPoint =
            worldToBoardPoint(
                tokenWorldX,
                tokenWorldY
            );

        const pulse =
            1 +
            gameState.landingPulse *
                0.28;

        if (
            gameState.landingPulse > 0
        ) {
            fill(
                255,
                155,
                135,
                85
            );

            ellipse(
                tokenPoint.x,
                tokenPoint.y,
                CONFIG.currentNodeSize *
                    1.9 *
                    pulse
            );
        }

        fill(
            255,
            105,
            92
        );

        ellipse(
            tokenPoint.x,
            tokenPoint.y,
            CONFIG.currentNodeSize *
                pulse
        );

        drawNodeIcon(
            currentNode,
            tokenPoint.x,
            tokenPoint.y,
            18,
            255
        );
    }

    popMatrix();
    clip();
}

function drawBranchBoardOverlay() {
    const branch =
        gameState.branch;

    const node =
        BOARD_NODES[
            branch.activeNodeId
        ];

    if (
        !node ||
        !node.choices ||
        node.choices.length < 2
    ) {
        return;
    }

    const currentPosition =
        getBoardNodeScreenPosition(
            node.id
        );

    const selectedIndex =
        getCurrentBranchChoiceIndex();

    for (
        let index = 0;
        index < node.choices.length;
        index += 1
    ) {
        const choice =
            node.choices[index];

        const nextNode =
            BOARD_NODES[
                choice.next
            ];

        if (!nextNode) {
            continue;
        }

        const position =
            getBoardNodeScreenPosition(
                nextNode.id
            );

        const selected =
            index ===
            selectedIndex;

        const pulse =
            1 +
            Math.sin(
                ElapsedTime *
                    CONFIG.branchPulseSpeed
            ) *
                0.08;

        if (selected) {
            stroke(
                255,
                214,
                120,
                230
            );

            strokeWidth(5);
        } else {
            stroke(
                135,
                125,
                118,
                120
            );

            strokeWidth(3);
        }

        line(
            currentPosition.x,
            currentPosition.y,
            position.x,
            position.y
        );

        noFill();

        if (selected) {
            stroke(
                255,
                225,
                155,
                220
            );
        } else {
            stroke(
                170,
                160,
                150,
                100
            );
        }

        strokeWidth(
            selected
                ? 3
                : 2
        );

        ellipse(
            position.x,
            position.y,
            selected
                ? 54 * pulse
                : 38
        );

        noStroke();

        if (selected) {
            fill(
                255,
                226,
                160,
                230
            );
        } else {
            fill(
                210,
                200,
                190,
                130
            );
        }

        fontSize(
            selected
                ? 25
                : 19
        );

        textAlign(CENTER);

        text(
            index === 0
                ? "←"
                : "→",
            position.x,
            position.y + 31
        );
    }

    noStroke();
}



function segmentNearPanel(p1, p2, w, h) {
  const margin = 24;

  const p1Inside =
    p1.x > -margin &&
    p1.x < w + margin &&
    p1.y > -margin &&
    p1.y < h + margin;

  const p2Inside =
    p2.x > -margin &&
    p2.x < w + margin &&
    p2.y > -margin &&
    p2.y < h + margin;

  return p1Inside || p2Inside;
}

function drawNodeIcon(
  node,
  x,
  y,
  size,
  alpha,
) {
  if (node.id === "start") {
    noFill();
    stroke(245, 238, 228, alpha);
    strokeWidth(2);

    rectMode(CENTER);

    rect(
      x,
      y,
      size * 0.72,
      size,
      2,
    );

    rectMode(CORNER);
    noStroke();

    return;
  }

  if (node.id === "goal") {
    fill(240, 190, 90, alpha);

    ellipse(
      x,
      y,
      size,
    );

    return;
  }

  if (
    node.effect &&
    node.effect.addIngredient
  ) {
    drawIngredientIcon(
      node.effect.addIngredient,
      x,
      y,
      size,
      alpha,
    );

    return;
  }

  if (
    node.effect &&
    node.effect.addMystery
  ) {
    fill(220, 170, 220, alpha);

    fontSize(size * 1.15);
    textAlign(CENTER);

    text(
      "?",
      x,
      y,
    );

    return;
  }

  if (node.nodeType === "event_gate") {
    noFill();
    stroke(210, 215, 245, alpha);
    strokeWidth(2);

    pushMatrix();
    translate(x, y);
    rotate(ElapsedTime * 45);

    for (let i = 0; i < 10; i += 1) {
      const a1 = i * 42;
      const a2 = (i + 1) * 42;

      const r1 = i * 0.65;
      const r2 = (i + 1) * 0.65;

      line(
        Math.cos(a1 * Math.PI / 180) * r1,
        Math.sin(a1 * Math.PI / 180) * r1,
        Math.cos(a2 * Math.PI / 180) * r2,
        Math.sin(a2 * Math.PI / 180) * r2,
      );
    }

    popMatrix();
    noStroke();

    return;
  }

  if (
    node.effect &&
    node.effect.pressureDelta > 0
  ) {
    fill(180, 225, 245, alpha);

    ellipse(
      x - 4,
      y - 3,
      4,
    );

    ellipse(
      x + 3,
      y + 1,
      5,
    );

    ellipse(
      x,
      y + 5,
      3,
    );
  }
}

function drawCapPanel() {
    const panel =
        layout.cap;

    const cap =
        gameState.cap;

    drawPanelFrame(
        panel
    );

    const movementActive =
        gameState.phase ===
            "MOVING" ||
        gameState.phase ===
            "MOVE_COUNT_TICK" ||
        gameState.phase ===
            "MOVE_COUNT_ZERO" ||
        gameState.phase ===
            "LANDING" ||
        gameState.phase ===
            "WAIT_BRANCH_PREVIEW";

    if (movementActive) {
        return;
    }

    pushMatrix();

    translate(
        panel.x,
        panel.y
    );

    const physicsVisible =
        gameState.phase ===
            "CAP_PHYSICS" ||
        gameState.phase ===
            "CAP_POWER_RESULT" ||
        gameState.phase ===
            "TRANSFERRING_MOVE_COUNT";

    if (physicsVisible) {
        drawCrownPhysicsTrail(
            panel
        );

        drawCrownPhysicsBoard(
            panel
        );

        drawCrownPhysicsImpact(
            panel
        );
    } else {
        const isSliding =
            gameState.phase ===
            "CAP_SLIDING";

        const gaugeLayout =
            getMainGaugeLayout(
                panel
            );

        drawMainCapPressureGauge(
            panel,
            cap.power,
            isSliding
        );

        drawCrownAimFeedback(
            gaugeLayout,
            isSliding
        );

        const capSize =
            Math.min(
                CONFIG.capSize * 1.08,
                panel.w * 0.25,
                panel.h * 0.16
            );

        const aimRotation =
            isSliding &&
            gameState.crownAim
                ? gameState.crownAim.value *
                    10
                : 0;

        drawCap(
            gaugeLayout.centerX,
            gaugeLayout.centerY,
            aimRotation,
            capSize
        );
    }

    rectMode(CORNER);

    popMatrix();
}

function drawCrownAimFeedback(
    gaugeLayout,
    visible
) {
    if (
        !visible ||
        !gameState.crownAim
    ) {
        return;
    }

    const aimValue =
        gameState.crownAim.value;

    const pulse =
        1 +
        Math.sin(
            ElapsedTime *
            18
        ) *
        0.08;

    const targetX =
        gaugeLayout.centerX +
        aimValue *
            gaugeLayout.radius *
            0.72;

    const targetY =
        gaugeLayout.centerY -
        gaugeLayout.radius *
            0.58;

    noFill();

    stroke(
        255,
        218,
        145,
        150
    );

    strokeWidth(2);

    line(
        gaugeLayout.centerX,
        gaugeLayout.centerY,
        targetX,
        targetY
    );

    stroke(
        255,
        233,
        185,
        220
    );

    strokeWidth(3);

    ellipse(
        targetX,
        targetY,
        gaugeLayout.radius *
            0.16 *
            pulse
    );

    noStroke();

    fill(
        255,
        225,
        160,
        210
    );

    ellipse(
        targetX,
        targetY,
        gaugeLayout.radius *
            0.055 *
            pulse
    );
}



function drawCrownPhysicsTrail(
    panel
) {
    const physics =
        gameState.crownPhysics;

    if (
        !physics ||
        !physics.trail ||
        physics.trail.length === 0
    ) {
        return;
    }

    const board =
        getCrownPhysicsLayout(
            panel
        );

    const trailAlpha =
        physics.trailAlpha ===
        undefined
            ? 1
            : physics.trailAlpha;

    for (
        let index = 0;
        index <
            physics.trail.length;
        index += 1
    ) {
        const point =
            physics.trail[index];

        const ratio =
            (
                index +
                1
            ) /
            physics.trail.length;

        const alpha =
            (
                12 +
                ratio *
                    58
            ) *
            trailAlpha;

        const size =
            board.capSize *
            (
                0.40 +
                ratio *
                    0.25
            );

        noFill();

        stroke(
            255,
            220,
            155,
            alpha
        );

        strokeWidth(
            1 +
            ratio *
                1.5
        );

        ellipse(
            point.x,
            point.y,
            size
        );

        if (index > 0) {
            const previous =
                physics.trail[
                    index -
                    1
                ];

            stroke(
                230,
                174,
                98,
                alpha * 0.58
            );

            strokeWidth(
                1 +
                ratio
            );

            line(
                previous.x,
                previous.y,
                point.x,
                point.y
            );
        }
    }

    noStroke();
}

function drawCrownPhysicsImpact(
    panel
) {
    const physics =
        gameState.crownPhysics;

    if (!physics) {
        return;
    }

    const board =
        getCrownPhysicsLayout(
            panel
        );

    if (
        physics.impactFlash > 0
    ) {
        const progress =
            1 -
            physics.impactFlash;

        const ringSize =
            board.capSize *
            (
                1.1 +
                progress *
                    2.0
            );

        noFill();

        stroke(
            255,
            231,
            174,
            physics.impactFlash *
                220
        );

        strokeWidth(
            2 +
            physics.impactStrength *
                4
        );

        ellipse(
            physics.impactX,
            physics.impactY,
            ringSize
        );

        const tangentX =
            -physics.impactNormalY;

        const tangentY =
            physics.impactNormalX;

        const sparkLength =
            board.capSize *
            (
                0.35 +
                physics.impactStrength *
                    0.65
            );

        for (
            let index = 0;
            index <
                CROWN_PHYSICS_CONFIG.impactSparkCount;
            index += 1
        ) {
            const spread =
                (
                    index /
                    Math.max(
                        1,
                        CROWN_PHYSICS_CONFIG.impactSparkCount -
                            1
                    ) -
                    0.5
                ) *
                1.5;

            const directionX =
                -physics.impactNormalX +
                tangentX *
                    spread;

            const directionY =
                -physics.impactNormalY +
                tangentY *
                    spread;

            const length =
                sparkLength *
                (
                    0.55 +
                    (
                        index %
                        3
                    ) *
                        0.18
                );

            stroke(
                255,
                204,
                112,
                physics.impactFlash *
                    230
            );

            strokeWidth(2);

            line(
                physics.impactX,
                physics.impactY,
                physics.impactX +
                    directionX *
                        length,
                physics.impactY +
                    directionY *
                        length
            );
        }

        noStroke();
    }

    if (
        physics.stopFlash > 0 ||
        physics.stopRing > 0
    ) {
        const ringProgress =
            physics.stopRing || 0;

        const ringSize =
            board.capSize *
            (
                1.35 +
                ringProgress *
                    2.2
            );

        noFill();

        stroke(
            255,
            229,
            164,
            Math.max(
                0,
                220 *
                    (
                        1 -
                        ringProgress
                    )
            )
        );

        strokeWidth(
            4 -
            ringProgress *
                2
        );

        ellipse(
            gameState.cap.x,
            gameState.cap.y,
            ringSize
        );

        stroke(
            255,
            247,
            215,
            physics.stopFlash *
                125
        );

        strokeWidth(7);

        ellipse(
            gameState.cap.x,
            gameState.cap.y,
            board.capSize *
                (
                    1.05 +
                    physics.stopFlash *
                        0.35
                )
        );

        noStroke();
    }
}




function getCrownPhysicsLayout(
    panel
) {
    const radius =
        Math.min(
            panel.w * 0.42,
            panel.h * 0.38
        );

    const capSize =
        Math.min(
            CONFIG.capSize * 1.18,
            radius * 0.32
        );

    const maxDistance =
        Math.max(
            20,
            radius -
                capSize * 0.56 -
                5
        );

    const centerX =
        panel.w * 0.50;

    const centerY =
        panel.h * 0.52;

    return {
        centerX: centerX,
        centerY: centerY,
        radius: radius,
        capSize: capSize,
        maxDistance:
            maxDistance,

        launchY:
            centerY -
            maxDistance *
                CROWN_PHYSICS_CONFIG.launchStartRatio,
    };
}

function drawCrownPhysicsBoard(
    panel
) {
    const board =
        getCrownPhysicsLayout(
            panel
        );

    const cap =
        gameState.cap;

    const physics =
        gameState.crownPhysics;

    const resultVisible =
        gameState.phase ===
            "CAP_POWER_RESULT" ||
        gameState.phase ===
            "TRANSFERRING_MOVE_COUNT";

    const resultValue =
        resultVisible
            ? cap.distance
            : null;

    const branchRelevant =
        isCrownBranchRelevant(
            resultVisible
        );

    const branchIndex =
        branchRelevant &&
        resultVisible &&
        typeof gameState.rollBranchIndex ===
            "number"
            ? gameState.rollBranchIndex
            : null;

    const arrowPulse =
        resultVisible
            ? 1 +
                Math.sin(
                    ElapsedTime *
                        10
                ) *
                    0.08
            : 1;

    noStroke();

    fill(
        18,
        14,
        14,
        235
    );

    ellipse(
        board.centerX,
        board.centerY,
        board.radius * 2
    );

    fill(
        resultValue === 1
            ? 101
            : 55,
        resultValue === 1
            ? 72
            : 45,
        resultValue === 1
            ? 43
            : 38,
        255
    );

    ellipse(
        board.centerX,
        board.centerY,
        board.maxDistance * 2
    );

    fill(
        resultValue === 2
            ? 147
            : 83,
        resultValue === 2
            ? 96
            : 59,
        resultValue === 2
            ? 42
            : 39,
        255
    );

    ellipse(
        board.centerX,
        board.centerY,
        board.maxDistance *
            CROWN_PHYSICS_CONFIG.outerZoneEnd *
            2
    );

    fill(
        resultValue === 3
            ? 211
            : 116,
        resultValue === 3
            ? 143
            : 77,
        resultValue === 3
            ? 54
            : 43,
        255
    );

    ellipse(
        board.centerX,
        board.centerY,
        board.maxDistance *
            CROWN_PHYSICS_CONFIG.centerZoneEnd *
            2
    );

    noFill();

    stroke(
        195,
        173,
        153,
        physics
            ? 150 +
                physics.wallFlash *
                    105
            : 150
    );

    strokeWidth(
        physics
            ? 3 +
                physics.wallFlash *
                    4
            : 3
    );

    ellipse(
        board.centerX,
        board.centerY,
        board.radius * 2
    );

    stroke(
        205,
        183,
        154,
        125
    );

    strokeWidth(2);

    ellipse(
        board.centerX,
        board.centerY,
        board.maxDistance * 2
    );

    ellipse(
        board.centerX,
        board.centerY,
        board.maxDistance *
            CROWN_PHYSICS_CONFIG.outerZoneEnd *
            2
    );

    ellipse(
        board.centerX,
        board.centerY,
        board.maxDistance *
            CROWN_PHYSICS_CONFIG.centerZoneEnd *
            2
    );

    if (branchRelevant) {
        stroke(
            214,
            192,
            160,
            resultVisible
                ? 105
                : 58
        );

        strokeWidth(
            resultVisible
                ? 2
                : 1
        );

        line(
            board.centerX,
            board.centerY -
                board.radius *
                    0.91,
            board.centerX,
            board.centerY +
                board.radius *
                    0.91
        );
    }

    noStroke();

    fill(
        244,
        225,
        184,
        resultValue === 1
            ? 255
            : 135
    );

    fontSize(
        Math.max(
            14,
            board.radius *
                0.18
        )
    );

    textAlign(CENTER);

    text(
        "1",
        board.centerX -
            board.maxDistance *
                0.79,
        board.centerY
    );

    text(
        "1",
        board.centerX +
            board.maxDistance *
                0.79,
        board.centerY
    );

    fill(
        255,
        224,
        154,
        resultValue === 2
            ? 255
            : 150
    );

    text(
        "2",
        board.centerX -
            board.maxDistance *
                0.47,
        board.centerY
    );

    text(
        "2",
        board.centerX +
            board.maxDistance *
                0.47,
        board.centerY
    );

    fill(
        255,
        238,
        190,
        resultValue === 3
            ? 255
            : 185
    );

    text(
        "3",
        board.centerX,
        board.centerY
    );

    if (branchRelevant) {
        const arrowY =
            board.centerY +
            board.radius *
                0.72;

        const arrowOffset =
            board.maxDistance *
                0.58;

        fill(
            255,
            226,
            160,
            branchIndex === 0
                ? 255
                : resultVisible
                    ? 72
                    : 125
        );

        fontSize(
            Math.max(
                18,
                board.radius *
                    0.25 *
                    (
                        branchIndex === 0
                            ? arrowPulse
                            : 1
                    )
            )
        );

        text(
            "←",
            board.centerX -
                arrowOffset,
            arrowY
        );

        fill(
            255,
            226,
            160,
            branchIndex === 1
                ? 255
                : resultVisible
                    ? 72
                    : 125
        );

        fontSize(
            Math.max(
                18,
                board.radius *
                    0.25 *
                    (
                        branchIndex === 1
                            ? arrowPulse
                            : 1
                    )
            )
        );

        text(
            "→",
            board.centerX +
                arrowOffset,
            arrowY
        );
    }

    noFill();

    stroke(
        235,
        205,
        165,
        95
    );

    strokeWidth(2);

    line(
        board.centerX,
        board.launchY -
            board.capSize *
                0.55,
        board.centerX,
        board.launchY -
            board.capSize *
                1.05
    );

    noStroke();

    drawCap(
        cap.x,
        cap.y,
        cap.rotation,
        board.capSize
    );

    if (resultVisible) {
        drawCapRollPips(
            cap.x,
            cap.y,
            cap.rotation,
            board.capSize,
            cap.distance,
            255
        );

        const pulse =
            1 +
            Math.sin(
                ElapsedTime *
                    11
            ) *
                0.055;

        const badgeW =
            Math.min(
                board.radius *
                    1.16,
                94
            );

        const badgeH =
            Math.min(
                board.radius *
                    0.50,
                48
            );

        const badgeX =
            board.centerX;

        const badgeY =
            board.centerY +
            board.radius *
                0.88;

        rectMode(CENTER);

        fill(
            21,
            15,
            14,
            235
        );

        rect(
            badgeX,
            badgeY,
            badgeW *
                pulse,
            badgeH *
                pulse,
            badgeH *
                0.40
        );

        noFill();

        stroke(
            cap.isOverPower
                ? 245
                : 255,
            cap.isOverPower
                ? 94
                : 219,
            cap.isOverPower
                ? 80
                : 137,
            235
        );

        strokeWidth(3);

        rect(
            badgeX,
            badgeY,
            badgeW *
                pulse,
            badgeH *
                pulse,
            badgeH *
                0.40
        );

        noStroke();

        fill(
            255,
            242,
            205,
            255
        );

        fontSize(
            badgeH *
                0.70
        );

        let directionResult =
            String(
                cap.distance
            );

        if (branchRelevant) {
            directionResult =
                branchIndex === 0
                    ? "← " +
                        String(
                            cap.distance
                        )
                    : String(
                        cap.distance
                    ) +
                        " →";
        }

        text(
            directionResult,
            badgeX,
            badgeY
        );

        rectMode(CORNER);
    }
}






function getMainGaugeLayout(panel) {
    const sourceRadius =
        Math.min(
            panel.w * 0.34,
            panel.h * 0.12
        );

    const radius =
        Math.min(
            panel.w * 0.40,
            panel.h * 0.28
        );

    return {
        centerX:
            panel.w * 0.50,

        centerY:
            panel.h * 0.34,

        radius:
            radius,

        scale:
            sourceRadius > 0
                ? radius /
                    sourceRadius
                : 1,

        sourceCenterX:
            panel.w * 0.50,

        sourceCenterY:
            panel.h * 0.075,
    };
}

function drawMainCapPressureGauge(
    panel,
    power,
    sliding
) {
    const gaugeLayout =
        getMainGaugeLayout(
            panel
        );

    pushMatrix();

    translate(
        gaugeLayout.centerX,
        gaugeLayout.centerY
    );

    scale(
        gaugeLayout.scale,
        gaugeLayout.scale
    );

    translate(
        -gaugeLayout.sourceCenterX,
        -gaugeLayout.sourceCenterY
    );

    drawCapPressureGauge(
        panel,
        power,
        false,
        sliding
    );

    popMatrix();
}

function getCapRollDisplayValue() {
    const roll =
        gameState.capRoll;

    if (!roll) {
        return gameState.cap.distance;
    }

    if (roll.locked) {
        return roll.finalValue;
    }

    const elapsed =
        Math.max(
            0,
            ElapsedTime -
                roll.startedAt
        );

    const cycle =
        Math.floor(
            elapsed *
            CAP_DICE_CONFIG.rollCyclesPerSecond
        );

    return (
        (
            cycle +
            roll.seed
        ) %
        3
    ) + 1;
}

function drawCapRollStage(
    panel,
    cap,
    isFlying,
    resultVisible,
    isTransferring
) {
    const displayValue =
        getCapRollDisplayValue();

    const resultMode =
        resultVisible ||
        isTransferring;

    const rollingCapSize =
        Math.min(
            CONFIG.capSize *
                CAP_DICE_CONFIG.crownScale,
            panel.w * 0.30,
            panel.h * 0.19
        );

    const resultX =
        panel.w * 0.50;

    const resultY =
        panel.h * 0.57;

    const resultCapSize =
        Math.min(
            panel.w * 0.44,
            panel.h * 0.31,
            rollingCapSize * 2.05
        );

    const pulse =
        resultVisible
            ? 1 +
                Math.sin(
                    ElapsedTime *
                    CAP_DICE_CONFIG.resultPulseSpeed
                ) *
                0.055
            : 1;

    if (resultMode) {
        const ringSize =
            resultCapSize *
            1.72 *
            pulse;

        noStroke();

        fill(
            12,
            9,
            9,
            170
        );

        ellipse(
            resultX,
            resultY,
            ringSize * 1.18
        );

        noFill();

        stroke(
            cap.isOverPower
                ? 245
                : 255,
            cap.isOverPower
                ? 90
                : 218,
            cap.isOverPower
                ? 80
                : 135,
            isTransferring
                ? 80
                : 190
        );

        strokeWidth(4);

        ellipse(
            resultX,
            resultY,
            ringSize
        );

        stroke(
            220,
            195,
            150,
            isTransferring
                ? 35
                : 85
        );

        strokeWidth(2);

        ellipse(
            resultX,
            resultY,
            ringSize * 1.24
        );

        noStroke();

        drawCap(
            resultX,
            resultY,
            cap.rotation,
            resultCapSize *
                pulse
        );

        drawCapRollPips(
            resultX,
            resultY,
            cap.rotation,
            resultCapSize *
                pulse,
            displayValue,
            255
        );

        const badgeW =
            Math.min(
                panel.w * 0.44,
                112
            );

        const badgeH =
            Math.min(
                panel.h * 0.18,
                54
            );

        const badgeY =
            resultY -
            resultCapSize * 0.92;

        rectMode(CENTER);

        fill(
            20,
            14,
            13,
            235
        );

        rect(
            resultX,
            badgeY,
            badgeW,
            badgeH,
            badgeH * 0.38
        );

        noFill();

        stroke(
            cap.isOverPower
                ? 245
                : 255,
            cap.isOverPower
                ? 95
                : 218,
            cap.isOverPower
                ? 85
                : 135,
            isTransferring
                ? 90
                : 225
        );

        strokeWidth(3);

        rect(
            resultX,
            badgeY,
            badgeW,
            badgeH,
            badgeH * 0.38
        );

        noStroke();

        fill(
            255,
            241,
            205,
            isTransferring
                ? 175
                : 255
        );

        fontSize(
            Math.min(
                46,
                badgeH * 0.78
            )
        );

        textAlign(CENTER);

        text(
            String(displayValue),
            resultX,
            badgeY
        );

        rectMode(CORNER);

        return;
    }

    noFill();

    stroke(
        205,
        185,
        165,
        35
    );

    strokeWidth(2);

    ellipse(
        panel.w * 0.50,
        panel.h * 0.58,
        panel.w * 0.66
    );

    stroke(
        205,
        185,
        165,
        18
    );

    ellipse(
        panel.w * 0.50,
        panel.h * 0.58,
        panel.w * 0.46
    );

    if (isFlying) {
        stroke(
            cap.isOverPower
                ? 245
                : 255,
            cap.isOverPower
                ? 95
                : 225,
            cap.isOverPower
                ? 85
                : 165,
            95
        );

        strokeWidth(3);

        ellipse(
            cap.x,
            cap.y,
            rollingCapSize * 1.62
        );
    }

    noStroke();

    drawCap(
        cap.x,
        cap.y,
        cap.rotation,
        rollingCapSize
    );

    drawCapRollPips(
        cap.x,
        cap.y,
        cap.rotation,
        rollingCapSize,
        displayValue,
        235
    );
}


function drawCapRollPips(
    x,
    y,
    rotation,
    size,
    value,
    alpha
) {
    const pipSize =
        Math.max(
            6,
            size * 0.12
        );

    const offset =
        size * 0.17;

    pushMatrix();

    translate(
        x,
        y
    );

    rotate(
        rotation
    );

    noStroke();

    fill(
        255,
        241,
        195,
        alpha
    );

    if (value === 1) {
        ellipse(
            0,
            0,
            pipSize
        );
    } else if (
        value === 2
    ) {
        ellipse(
            -offset,
            offset,
            pipSize
        );

        ellipse(
            offset,
            -offset,
            pipSize
        );
    } else {
        ellipse(
            -offset,
            offset,
            pipSize
        );

        ellipse(
            0,
            0,
            pipSize
        );

        ellipse(
            offset,
            -offset,
            pipSize
        );
    }

    popMatrix();
}








function drawCapPressureGauge(
    panel,
    power,
    locked,
    sliding
) {
    const centerX =
        panel.w * 0.50;

    const centerY =
        panel.h * 0.075;

    const radius =
        Math.min(
            panel.w * 0.34,
            panel.h * 0.12
        );

    const startAngle = 205;
    const endAngle = -25;

    const plateW =
        radius * 2.35;

    const plateH =
        radius * 1.48;

    rectMode(CENTER);
    noStroke();

    fill(
        18,
        15,
        15,
        180
    );

    rect(
        centerX,
        centerY +
            radius * 0.24,
        plateW,
        plateH,
        15
    );

    noFill();

    stroke(
        118,
        98,
        86,
        180
    );

    strokeWidth(2);

    rect(
        centerX,
        centerY +
            radius * 0.24,
        plateW,
        plateH,
        15
    );

    const zones = [
        {
            start: 0,
            end:
                CONFIG.capPowerZone1End,
            color:
                color(
                    126,
                    124,
                    72
                ),
        },
        {
            start:
                CONFIG.capPowerZone1End,
            end:
                CONFIG.capPowerZone2End,
            color:
                color(
                    205,
                    145,
                    55
                ),
        },
        {
            start:
                CONFIG.capPowerZone2End,
            end:
                CONFIG.capPowerZone3End,
            color:
                color(
                    230,
                    100,
                    35
                ),
        },
        {
            start:
                CONFIG.capPowerZone3End,
            end: 1,
            color:
                color(
                    230,
                    65,
                    60
                ),
        },
    ];

    for (
        let index = 0;
        index < zones.length;
        index += 1
    ) {
        const zone =
            zones[index];

        drawCapPressureArc(
            centerX,
            centerY,
            radius,
            startAngle,
            endAngle,
            zone.start,
            zone.end,
            zone.color,
            power >= zone.start &&
                power < zone.end
        );
    }

    for (
        let index = 0;
        index <= 20;
        index += 1
    ) {
        const ratio =
            index / 20;

        const angle =
            startAngle +
            (
                endAngle -
                startAngle
            ) *
            ratio;

        const radians =
            angle *
            Math.PI /
            180;

        const major =
            index % 5 === 0;

        const innerRadius =
            radius *
            (
                major
                    ? 0.72
                    : 0.81
            );

        const outerRadius =
            radius * 0.94;

        stroke(
            235,
            220,
            195,
            major
                ? 185
                : 85
        );

        strokeWidth(
            major
                ? 3
                : 1
        );

        line(
            centerX +
                Math.cos(
                    radians
                ) *
                innerRadius,
            centerY +
                Math.sin(
                    radians
                ) *
                innerRadius,
            centerX +
                Math.cos(
                    radians
                ) *
                outerRadius,
            centerY +
                Math.sin(
                    radians
                ) *
                outerRadius
        );
    }

    const baseAngle =
        startAngle +
        (
            endAngle -
            startAngle
        ) *
        power;

    let jitter = 0;

    if (sliding) {
        jitter =
            Math.sin(
                ElapsedTime * 48
            ) *
            2.2;
    } else if (
        power >=
        CONFIG.capPowerZone3End
    ) {
        jitter =
            Math.sin(
                ElapsedTime * 34
            ) *
            1.3;
    }

    const needleAngle =
        (
            baseAngle +
            jitter
        ) *
        Math.PI /
        180;

    const needleLength =
        radius * 0.70;

    stroke(
        35,
        18,
        16,
        180
    );

    strokeWidth(7);

    line(
        centerX + 2,
        centerY - 2,
        centerX +
            Math.cos(
                needleAngle
            ) *
            needleLength +
            2,
        centerY +
            Math.sin(
                needleAngle
            ) *
            needleLength -
            2
    );

    if (
        power >=
        CONFIG.capPowerZone3End
    ) {
        stroke(
            245,
            85,
            75,
            255
        );
    } else if (locked) {
        stroke(
            255,
            220,
            145,
            255
        );
    } else {
        stroke(
            245,
            235,
            210,
            245
        );
    }

    strokeWidth(3);

    line(
        centerX,
        centerY,
        centerX +
            Math.cos(
                needleAngle
            ) *
            needleLength,
        centerY +
            Math.sin(
                needleAngle
            ) *
            needleLength
    );

    noStroke();

    fill(
        58,
        47,
        42,
        255
    );

    ellipse(
        centerX,
        centerY,
        radius * 0.24
    );

    fill(
        210,
        190,
        165,
        255
    );

    ellipse(
        centerX,
        centerY,
        radius * 0.11
    );

    rectMode(CORNER);
}


function drawCapPressureArc(
    centerX,
    centerY,
    radius,
    startAngle,
    endAngle,
    rangeStart,
    rangeEnd,
    zoneColor,
    active
) {
    const segmentCount =
        Math.max(
            3,
            Math.ceil(
                (
                    rangeEnd -
                    rangeStart
                ) *
                30
            )
        );

    const innerRadius =
        radius *
        0.98;

    if (active) {
        stroke(
            zoneColor.r,
            zoneColor.g,
            zoneColor.b,
            90
        );

        strokeWidth(9);
    } else {
        stroke(
            zoneColor.r,
            zoneColor.g,
            zoneColor.b,
            55
        );

        strokeWidth(6);
    }

    for (
        let index = 0;
        index <
        segmentCount;
        index += 1
    ) {
        const ratio1 =
            rangeStart +
            (
                rangeEnd -
                rangeStart
            ) *
            (
                index /
                segmentCount
            );

        const ratio2 =
            rangeStart +
            (
                rangeEnd -
                rangeStart
            ) *
            (
                (
                    index +
                    1
                ) /
                segmentCount
            );

        const angle1 =
            (
                startAngle +
                (
                    endAngle -
                    startAngle
                ) *
                ratio1
            ) *
            Math.PI /
            180;

        const angle2 =
            (
                startAngle +
                (
                    endAngle -
                    startAngle
                ) *
                ratio2
            ) *
            Math.PI /
            180;

        line(
            centerX +
                Math.cos(
                    angle1
                ) *
                innerRadius,
            centerY +
                Math.sin(
                    angle1
                ) *
                innerRadius,
            centerX +
                Math.cos(
                    angle2
                ) *
                innerRadius,
            centerY +
                Math.sin(
                    angle2
                ) *
                innerRadius
        );
    }

    noStroke();
}




function drawBranchPanel() {
    const panel =
        layout.cap;

    const branch =
        gameState.branch;

    const node =
        BOARD_NODES[
            branch.activeNodeId
        ];

    drawPanelFrame(panel);

    if (
        !node ||
        !node.choices ||
        node.choices.length < 2
    ) {
        return;
    }

    pushMatrix();

    translate(
        panel.x,
        panel.y
    );

    const locked =
        gameState.phase ===
        "BRANCH_LOCKED";

    const selectedIndex =
        getCurrentBranchChoiceIndex();

    const centerY =
        panel.h * 0.58;

    const leftX =
        panel.w * 0.28;

    const rightX =
        panel.w * 0.72;

    const choiceW =
        Math.min(
            82,
            panel.w * 0.32
        );

    const choiceH =
        Math.min(
            82,
            panel.h * 0.34
        );

    const title =
        gameState.language === "ja"
            ? "すすむ方向"
            : "CHOOSE ROUTE";

    fill(
        235,
        225,
        212,
        190
    );

    noStroke();

    fontSize(
        Math.min(
            17,
            panel.h * 0.075
        )
    );

    textAlign(CENTER);

    text(
        title,
        panel.w * 0.5,
        panel.h * 0.88
    );

    for (
        let index = 0;
        index < 2;
        index += 1
    ) {
        const choice =
            node.choices[index];

        const nextNode =
            BOARD_NODES[
                choice.next
            ];

        const x =
            index === 0
                ? leftX
                : rightX;

        const selected =
            index ===
            selectedIndex;

        const pulse =
            1 +
            Math.sin(
                ElapsedTime *
                    CONFIG.branchPulseSpeed
            ) *
                0.05;

        rectMode(CENTER);

        if (selected) {
            fill(
                locked
                    ? 185
                    : 155,
                locked
                    ? 135
                    : 110,
                locked
                    ? 62
                    : 48,
                220
            );

            rect(
                x,
                centerY,
                choiceW * pulse,
                choiceH * pulse,
                12
            );

            noFill();

            stroke(
                255,
                225,
                155,
                235
            );

            strokeWidth(3);

            rect(
                x,
                centerY,
                choiceW + 8,
                choiceH + 8,
                14
            );

            noStroke();
        } else {
            fill(
                76,
                66,
                62,
                180
            );

            rect(
                x,
                centerY,
                choiceW,
                choiceH,
                12
            );
        }

        if (nextNode) {
            drawNodeIcon(
                nextNode,
                x,
                centerY + 9,
                selected
                    ? 25
                    : 20,
                selected
                    ? 255
                    : 145
            );
        }

        fill(
            selected
                ? 255
                : 205,
            selected
                ? 240
                : 198,
            selected
                ? 195
                : 190,
            selected
                ? 255
                : 160
        );

        fontSize(
            selected
                ? 26
                : 21
        );

        textAlign(CENTER);

        text(
            index === 0
                ? "←"
                : "→",
            x,
            centerY - 22
        );
    }

    const gaugeX =
        panel.w * 0.14;

    const gaugeY =
        panel.h * 0.16;

    const gaugeW =
        panel.w * 0.72;

    const gaugeH =
        Math.max(
            16,
            Math.min(
                22,
                panel.h * 0.09
            )
        );

    rectMode(CORNER);

    noStroke();

    fill(
        selectedIndex === 0
            ? 155
            : 78,
        selectedIndex === 0
            ? 110
            : 72,
        selectedIndex === 0
            ? 48
            : 68,
        220
    );

    rect(
        gaugeX,
        gaugeY,
        gaugeW * 0.5,
        gaugeH,
        5
    );

    fill(
        selectedIndex === 1
            ? 155
            : 78,
        selectedIndex === 1
            ? 110
            : 72,
        selectedIndex === 1
            ? 48
            : 68,
        220
    );

    rect(
        gaugeX +
            gaugeW * 0.5,
        gaugeY,
        gaugeW * 0.5,
        gaugeH,
        5
    );

    stroke(
        220,
        205,
        185,
        100
    );

    strokeWidth(2);

    line(
        gaugeX +
            gaugeW * 0.5,
        gaugeY,
        gaugeX +
            gaugeW * 0.5,
        gaugeY + gaugeH
    );

    noStroke();

    fill(
        locked
            ? 255
            : 245,
        locked
            ? 205
            : 238,
        locked
            ? 105
            : 228,
        255
    );

    rectMode(CENTER);

    rect(
        gaugeX +
            gaugeW *
                branch.power,
        gaugeY +
            gaugeH * 0.5,
        CONFIG.branchMarkerWidth,
        gaugeH + 10,
        2
    );

    if (locked) {
        noFill();

        stroke(
            255,
            220,
            145,
            170
        );

        strokeWidth(2);

        ellipse(
            selectedIndex === 0
                ? leftX
                : rightX,
            centerY,
            choiceW + 22 +
                Math.sin(
                    ElapsedTime * 11
                ) *
                    6
        );

        noStroke();
    }

    rectMode(CORNER);

    popMatrix();
}




function drawGaugeZone(
    x,
    y,
    w,
    h,
    active,
    normalColor,
    activeColor,
    roundLeft,
    roundRight
) {
    fill(
        active
            ? activeColor
            : normalColor
    );

    let radius = 0;

    if (roundLeft || roundRight) {
        radius = 4;
    }

    rect(
        x,
        y,
        w,
        h,
        radius
    );
}



function drawGlassPanel() {
    const panel =
        layout.glass;

    drawPanelFrame(panel);

    let shakeX = 0;
    let shakeY = 0;

    if (
        gameState.phase === "BURSTING" &&
        gameState.burstState
    ) {
        const strength =
            CONFIG.glassBurstShake *
            gameState.burstState.shake;

        shakeX =
            Math.sin(
                ElapsedTime * 47
            ) *
            strength;

        shakeY =
            Math.cos(
                ElapsedTime * 39
            ) *
            strength *
            0.45;
    } else if (
        gameState.glass.pressure ===
        CONFIG.pressureMax
    ) {
        shakeX =
            Math.sin(
                ElapsedTime * 30
            ) *
            CONFIG.glassWarningShake;
    }

    pushMatrix();

    translate(
        panel.x +
            shakeX,
        panel.y +
            shakeY
    );

    const baseScale =
        Math.min(
            panel.w / 160,
            panel.h / 320,
            0.86
        );

    const pulseScale =
        gameState.glassPulse
            ? gameState.glassPulse.scale
            : 1;

    const glassX =
        panel.w * 0.50;

    const glassY =
        panel.h * 0.47;

    pushMatrix();

    translate(
        glassX,
        glassY
    );

    scale(
        pulseScale,
        pulseScale
    );

    translate(
        -glassX,
        -glassY
    );

    drawGlass(
        glassX,
        glassY,
        baseScale
    );

    drawGlassGarnishLocal(
        glassX,
        glassY,
        baseScale
    );

    popMatrix();
    popMatrix();
}

function drawGlassGarnishLocal(
    glassX,
    glassY,
    scaleValue
) {
    const garnish =
        gameState.glass.garnish;

    if (!garnish) {
        return;
    }

    const slotH = 45;

    const glassH =
        slotH *
            CONFIG.glassCapacity +
        10;

    const topW = 130;

    const effect =
        gameState.garnishEffect;

    let garnishScale = 1;
    let garnishAlpha = 255;

    if (
        effect &&
        effect.visible
    ) {
        garnishScale =
            effect.scale;

        garnishAlpha =
            effect.alpha;
    }

    pushMatrix();

    if (garnish === "lemon") {
        const x =
            glassX -
            topW *
                scaleValue *
                0.5 +
            12 *
                scaleValue;

        const y =
            glassY +
            glassH *
                scaleValue *
                0.5;

        translate(
            x,
            y
        );

        scale(
            garnishScale,
            garnishScale
        );

        fill(
            240,
            225,
            65,
            garnishAlpha
        );

        noStroke();

        ellipse(
            0,
            0,
            28 *
                scaleValue
        );

        fill(
            40,
            34,
            34,
            garnishAlpha
        );

        ellipse(
            7 *
                scaleValue,
            5 *
                scaleValue,
            23 *
                scaleValue
        );

        stroke(
            255,
            245,
            150,
            garnishAlpha *
                0.7
        );

        strokeWidth(
            Math.max(
                1,
                2 *
                    scaleValue
            )
        );

        line(
            -8 *
                scaleValue,
            0,
            7 *
                scaleValue,
            0
        );

        noStroke();
    } else if (
        garnish === "cherry"
    ) {
        const x =
            glassX;

        const y =
            glassY +
            glassH *
                scaleValue *
                0.5 +
            8 *
                scaleValue;

        translate(
            x,
            y
        );

        scale(
            garnishScale,
            garnishScale
        );

        stroke(
            90,
            120,
            65,
            garnishAlpha
        );

        strokeWidth(
            Math.max(
                1,
                2 *
                    scaleValue
            )
        );

        line(
            0,
            5 *
                scaleValue,
            6 *
                scaleValue,
            25 *
                scaleValue
        );

        noStroke();

        fill(
            190,
            35,
            45,
            garnishAlpha
        );

        ellipse(
            0,
            0,
            17 *
                scaleValue
        );

        fill(
            255,
            155,
            155,
            garnishAlpha *
                0.75
        );

        ellipse(
            -3 *
                scaleValue,
            4 *
                scaleValue,
            5 *
                scaleValue
        );
    }

    popMatrix();
}




function drawGlass(x, y, s) {
    pushMatrix();
    translate(x, y);
    scale(s);

    const slotH = 45;

    const glassH =
        slotH *
            CONFIG.glassCapacity +
        10;

    const topW = 130;
    const bottomW = 100;

    stroke(
        245,
        238,
        228,
        110
    );

    strokeWidth(4);

    line(
        -topW / 2,
        glassH / 2,
        -bottomW / 2,
        -glassH / 2
    );

    line(
        topW / 2,
        glassH / 2,
        bottomW / 2,
        -glassH / 2
    );

    line(
        -bottomW / 2,
        -glassH / 2,
        bottomW / 2,
        -glassH / 2
    );

    stroke(
        245,
        238,
        228,
        30
    );

    strokeWidth(2);

    for (
        let index = 1;
        index <
            CONFIG.glassCapacity;
        index += 1
    ) {
        const slotY =
            -glassH / 2 +
            5 +
            index * slotH;

        const ratio =
            index /
            CONFIG.glassCapacity;

        const currentW =
            bottomW +
            (
                topW -
                bottomW
            ) *
                ratio;

        line(
            -currentW / 2,
            slotY,
            currentW / 2,
            slotY
        );
    }

    noStroke();

    fill(
        245,
        238,
        228,
        12
    );

    rectMode(CENTER);

    rect(
        0,
        0,
        topW,
        glassH,
        8
    );

    const eventAction =
        isEventActionPhase();

    const useAnimatedTransforms =
        shouldUseGlassTokenTransforms();

    for (
        let index = 0;
        index <
            gameState.glass.slots.length;
        index += 1
    ) {
        const token =
            gameState.glass.slots[
                index
            ];

        const baseY =
            getGlassSlotLocalY(
                index
            );

        const tokenY =
            useAnimatedTransforms &&
            token.drawY !==
                undefined
                ? token.drawY
                : baseY;

        const tokenX =
            useAnimatedTransforms &&
            token.drawX !==
                undefined
                ? token.drawX
                : 0;

        const tokenRotation =
            useAnimatedTransforms &&
            token.rot !==
                undefined
                ? token.rot
                : 0;

        const rawRatio =
            (
                tokenY +
                glassH / 2
            ) /
            glassH;

        const ratio =
            Math.max(
                0,
                Math.min(
                    1,
                    rawRatio
                )
            );

        const currentW =
            bottomW +
            (
                topW -
                bottomW
            ) *
                ratio -
            10;

        const isTop =
            index ===
            gameState.glass.slots.length -
                1;

        let isEventTarget =
            false;

        let isEventDimmed =
            false;

        if (
            eventAction &&
            gameState.eventResultData
        ) {
            const eventId =
                gameState.eventResultData.id;

            if (eventId === "flip") {
                if (
                    index === 0 ||
                    index ===
                        gameState.glass.slots.length -
                            1
                ) {
                    isEventTarget =
                        true;
                }
            } else if (
                eventId === "swap"
            ) {
                if (
                    token ===
                        gameState.eventTarget1 ||
                    token ===
                        gameState.eventTarget2
                ) {
                    isEventTarget =
                        true;
                } else {
                    isEventDimmed =
                        true;
                }
            } else if (
                eventId === "spill"
            ) {
                if (
                    token ===
                    gameState.eventTarget1
                ) {
                    isEventTarget =
                        true;
                } else {
                    isEventDimmed =
                        true;
                }
            }
        }

        const alpha =
            isEventDimmed
                ? 95
                : 255;

        pushMatrix();

        translate(
            tokenX,
            tokenY
        );

        rotate(
            tokenRotation
        );

        if (
            isTop &&
            !eventAction
        ) {
            stroke(
                245,
                238,
                228,
                160 +
                    Math.sin(
                        ElapsedTime * 8
                    ) *
                        75
            );

            strokeWidth(3);
        } else if (
            isEventTarget &&
            (
                gameState.phase ===
                    "EVENT_WARNING" ||
                gameState.phase ===
                    "EVENT_FINISHED"
            )
        ) {
            stroke(
                255,
                245,
                185,
                210 +
                    Math.sin(
                        ElapsedTime * 15
                    ) *
                        45
            );

            strokeWidth(4);
        } else {
            noStroke();
        }

        const ingredient =
            INGREDIENTS[
                token.ingredientId
            ];

        fill(
            ingredient.color.r,
            ingredient.color.g,
            ingredient.color.b,
            alpha
        );

        rectMode(CENTER);

        rect(
            0,
            0,
            currentW,
            slotH - 4,
            4
        );

        noStroke();

        let iconSize = 22;

        if (
            isTop &&
            !eventAction
        ) {
            iconSize +=
                Math.sin(
                    ElapsedTime * 4
                ) *
                2;
        }

        if (isEventTarget) {
            iconSize *= 1.12;
        }

        drawIngredientIcon(
            token.ingredientId,
            0,
            0,
            iconSize,
            alpha
        );

        popMatrix();
    }

    const pressureY =
        -glassH / 2 -
        20;

    for (
        let index = 1;
        index <=
            CONFIG.pressureMax;
        index += 1
    ) {
        if (
            index <=
            gameState.glass.pressure
        ) {
            fill(
                120,
                205,
                235,
                210
            );
        } else {
            fill(
                100,
                95,
                95,
                80
            );
        }

        ellipse(
            -30 +
                index * 12,
            pressureY,
            6
        );
    }

    rectMode(CORNER);
    popMatrix();
}


function getColaLayerPalette(ingredientId) {
    if (ingredientId === "ice") {
        return {
            base: [176, 214, 230],
            deep: [136, 176, 195],
            surface: [230, 246, 252],
            shine: [255, 255, 255],
            bubble: [240, 248, 255]
        };
    }

    if (ingredientId === "vanilla") {
        return {
            base: [226, 217, 164],
            deep: [190, 172, 108],
            surface: [247, 241, 205],
            shine: [255, 252, 230],
            bubble: [246, 234, 195]
        };
    }

    if (ingredientId === "caramel") {
        return {
            base: [178, 106, 24],
            deep: [120, 64, 14],
            surface: [214, 145, 52],
            shine: [250, 205, 110],
            bubble: [245, 222, 170]
        };
    }

    if (ingredientId === "ginger") {
        return {
            base: [171, 114, 52],
            deep: [108, 66, 28],
            surface: [214, 168, 92],
            shine: [240, 216, 148],
            bubble: [240, 219, 168]
        };
    }

    if (ingredientId === "cinnamon") {
        return {
            base: [150, 76, 34],
            deep: [94, 46, 18],
            surface: [198, 120, 66],
            shine: [225, 178, 116],
            bubble: [232, 210, 165]
        };
    }

    if (ingredientId === "lemon_peel") {
        return {
            base: [205, 199, 66],
            deep: [148, 128, 38],
            surface: [238, 230, 112],
            shine: [255, 248, 180],
            bubble: [250, 240, 190]
        };
    }

    if (ingredientId === "herb") {
        return {
            base: [66, 118, 62],
            deep: [40, 76, 38],
            surface: [96, 156, 92],
            shine: [164, 205, 128],
            bubble: [218, 228, 176]
        };
    }

    if (ingredientId === "brown_sugar") {
        return {
            base: [124, 82, 42],
            deep: [76, 44, 20],
            surface: [162, 112, 62],
            shine: [208, 164, 102],
            bubble: [232, 214, 175]
        };
    }

    if (ingredientId === "secret_syrup") {
        return {
            base: [86, 54, 102],
            deep: [48, 22, 62],
            surface: [128, 82, 144],
            shine: [198, 158, 206],
            bubble: [228, 214, 236]
        };
    }

    if (ingredientId === "thick_syrup") {
        return {
            base: [96, 52, 20],
            deep: [54, 28, 10],
            surface: [136, 84, 38],
            shine: [198, 154, 88],
            bubble: [232, 214, 172]
        };
    }

    return {
        base: [124, 70, 24],
        deep: [70, 36, 12],
        surface: [172, 108, 40],
        shine: [225, 186, 102],
        bubble: [240, 220, 176]
    };
}

function drawColaLayer(
    ingredientId,
    width,
    height,
    alpha,
    isTop,
    slotIndex,
    pressureRatio
) {
    const palette =
        getColaLayerPalette(
            ingredientId
        );

    const radius = 6;

    noStroke();

    fill(
        palette.base[0],
        palette.base[1],
        palette.base[2],
        alpha
    );

    rect(
        0,
        0,
        width,
        height,
        radius
    );

    fill(
        palette.deep[0],
        palette.deep[1],
        palette.deep[2],
        alpha * 0.62
    );

    rect(
        -width * 0.18,
        0,
        width * 0.42,
        height,
        radius
    );

    fill(
        40,
        18,
        12,
        alpha * 0.12
    );

    rect(
        0,
        -height * 0.20,
        width,
        height * 0.34,
        radius
    );

    fill(
        palette.surface[0],
        palette.surface[1],
        palette.surface[2],
        alpha * 0.92
    );

    ellipse(
        0,
        height * 0.36,
        width * 0.94,
        Math.max(
            8,
            height * 0.26
        )
    );

    fill(
        palette.shine[0],
        palette.shine[1],
        palette.shine[2],
        alpha * 0.20
    );

    rect(
        width * 0.18,
        0,
        Math.max(
            6,
            width * 0.15
        ),
        height * 0.82,
        5
    );

    fill(
        255,
        250,
        235,
        alpha * 0.08
    );

    rect(
        -width * 0.05,
        height * 0.08,
        width * 0.26,
        height * 0.20,
        5
    );

    drawColaLayerBubbles(
        width,
        height,
        slotIndex,
        alpha,
        palette,
        pressureRatio
    );

    if (
        isTop &&
        ingredientId !== "ice"
    ) {
        const foamAlpha =
            28 +
            pressureRatio * 55;

        fill(
            240,
            230,
            195,
            foamAlpha
        );

        ellipse(
            -width * 0.18,
            height * 0.47,
            width * 0.18,
            7
        );

        ellipse(
            0,
            height * 0.49,
            width * 0.26,
            8
        );

        ellipse(
            width * 0.20,
            height * 0.47,
            width * 0.16,
            7
        );
    }
}

function drawColaLayerBubbles(
    width,
    height,
    slotIndex,
    alpha,
    palette,
    pressureRatio
) {
    let bubbleCount =
        1 +
        Math.floor(
            pressureRatio * 3
        );

    if (
        bubbleCount < 1
    ) {
        bubbleCount = 1;
    }

    for (
        let index = 0;
        index < bubbleCount;
        index += 1
    ) {
        const seed =
            (slotIndex + 1) * 17 +
            index * 29;

        const phase =
            ElapsedTime * 1.8 +
            seed * 0.35;

        const offsetX =
            Math.sin(
                phase * 0.9
            ) *
            width *
            (
                0.10 +
                index * 0.04
            );

        const baseY =
            -height * 0.22 +
            index *
                (
                    height * 0.18
                );

        const driftY =
            Math.sin(
                phase
            ) *
            height *
            0.06;

        const size =
            2.8 +
            (
                Math.sin(
                    phase * 1.3
                ) +
                1
            ) *
                1.0;

        fill(
            palette.bubble[0],
            palette.bubble[1],
            palette.bubble[2],
            alpha *
                (
                    0.16 +
                    pressureRatio *
                        0.14
                )
        );

        ellipse(
            offsetX,
            baseY + driftY,
            size
        );

        fill(
            255,
            255,
            255,
            alpha * 0.08
        );

        ellipse(
            offsetX -
                size * 0.18,
            baseY +
                driftY +
                size * 0.10,
            size * 0.28
        );
    }
}






function drawAromaLines(x, y) {
  noFill();
  stroke(250, 240, 205, 130);
  strokeWidth(2);

  for (let i = -1; i <= 1; i += 1) {
    const ox = i * 10;

    line(
      x + ox,
      y,
      x + ox - 3,
      y + 7,
    );

    line(
      x + ox - 3,
      y + 7,
      x + ox + 2,
      y + 14,
    );
  }

  noStroke();
}

function drawCap(
  x,
  y,
  rotation,
  size,
) {
  pushMatrix();
  translate(x, y);
  rotate(rotation);

  const r = size / 2;

  noStroke();
  fill(178, 160, 142);

  for (let i = 0; i < 12; i += 1) {
    pushMatrix();
    rotate(i * 30);

    ellipse(
      0,
      r,
      Math.max(
        4,
        size * 0.18,
      ),
    );

    popMatrix();
  }

  fill(205, 185, 165);

  ellipse(
    0,
    0,
    size,
  );

  fill(152, 52, 48);

  ellipse(
    0,
    0,
    size * 0.50,
  );

  popMatrix();
}

function drawIngredientIcon(
  id,
  x,
  y,
  size,
  alpha,
) {
  pushMatrix();
  translate(x, y);
  noStroke();

  if (id === "base_syrup") {
    fill(180, 100, 20, alpha);

    ellipse(
      0,
      -size * 0.08,
      size * 0.72,
    );

    fill(
      225,
      160,
      70,
      alpha * 0.8,
    );

    ellipse(
      -size * 0.14,
      size * 0.12,
      size * 0.18,
    );
  } else if (id === "thick_syrup") {
    fill(120, 60, 10, alpha);

    ellipse(
      0,
      -size * 0.08,
      size * 0.82,
    );

    fill(74, 38, 8, alpha);

    ellipse(
      0,
      -size * 0.12,
      size * 0.42,
    );
  } else if (id === "vanilla") {
    fill(255, 250, 200, alpha);

    ellipse(
      -size * 0.20,
      0,
      size * 0.45,
    );

    ellipse(
      size * 0.20,
      0,
      size * 0.45,
    );

    ellipse(
      0,
      -size * 0.20,
      size * 0.45,
    );

    ellipse(
      0,
      size * 0.20,
      size * 0.45,
    );

    fill(205, 180, 100, alpha);

    ellipse(
      0,
      0,
      size * 0.26,
    );
  } else if (id === "caramel") {
    fill(150, 80, 0, alpha);

    ellipse(
      0,
      0,
      size * 0.82,
    );

    noFill();
    stroke(220, 145, 45, alpha);

    strokeWidth(
      Math.max(
        1.5,
        size * 0.10,
      ),
    );

    ellipse(
      0,
      0,
      size * 0.42,
    );

    noStroke();
  } else if (id === "ginger") {
    fill(200, 180, 80, alpha);
    rectMode(CENTER);

    pushMatrix();
    rotate(16);

    rect(
      0,
      0,
      size * 0.78,
      size * 0.28,
      3,
    );

    popMatrix();

    pushMatrix();
    translate(
      size * 0.18,
      -size * 0.17,
    );

    rotate(-34);

    rect(
      0,
      0,
      size * 0.42,
      size * 0.22,
      3,
    );

    popMatrix();

    rectMode(CORNER);
  } else if (id === "cinnamon") {
    fill(160, 70, 30, alpha);
    rectMode(CENTER);

    pushMatrix();
    translate(
      -size * 0.14,
      0,
    );

    rotate(20);

    rect(
      0,
      0,
      size * 0.18,
      size * 0.78,
      3,
    );

    popMatrix();

    pushMatrix();
    translate(
      size * 0.14,
      0,
    );

    rotate(20);

    rect(
      0,
      0,
      size * 0.18,
      size * 0.78,
      3,
    );

    popMatrix();

    rectMode(CORNER);
  } else if (id === "lemon_peel") {
    fill(225, 220, 62, alpha);

    ellipse(
      0,
      0,
      size * 0.82,
    );

    fill(40, 34, 34, alpha);

    ellipse(
      size * 0.22,
      -size * 0.20,
      size * 0.78,
    );
  } else if (id === "ice") {
    fill(200, 240, 255, alpha);
    rectMode(CENTER);

    pushMatrix();
    rotate(45);

    rect(
      0,
      0,
      size * 0.58,
      size * 0.58,
      3,
    );

    popMatrix();

    rectMode(CORNER);
  } else if (id === "herb") {
    fill(50, 110, 55, alpha);

    pushMatrix();
    rotate(-24);

    ellipse(
      0,
      0,
      size * 0.82,
      size * 0.42,
    );

    popMatrix();
  } else if (id === "brown_sugar") {
    fill(82, 52, 24, alpha);
    rectMode(CENTER);

    rect(
      0,
      0,
      size * 0.60,
      size * 0.60,
      3,
    );

    rectMode(CORNER);
  } else if (id === "secret_syrup") {
    fill(58, 25, 68, alpha);

    ellipse(
      0,
      0,
      size * 0.82,
    );

    fill(205, 120, 210, alpha);
    rectMode(CENTER);

    pushMatrix();
    rotate(45);

    rect(
      0,
      0,
      size * 0.28,
      size * 0.28,
      2,
    );

    popMatrix();

    rectMode(CORNER);
  } else {
    fill(205, 200, 195, alpha);

    ellipse(
      0,
      0,
      size * 0.55,
    );
  }

  popMatrix();
}

function drawEventIcon(
    eventId,
    x,
    y,
    size,
    alpha
) {
    pushMatrix();

    translate(
        x,
        y
    );

    const iconAlpha =
        alpha === undefined
            ? 255
            : alpha;

    noFill();

    stroke(
        255,
        248,
        235,
        iconAlpha
    );

    strokeWidth(
        Math.max(
            2,
            size * 0.09
        )
    );

    if (eventId === "flip") {
        line(
            0,
            -size * 0.40,
            0,
            size * 0.40
        );

        line(
            0,
            size * 0.40,
            -size * 0.20,
            size * 0.20
        );

        line(
            0,
            size * 0.40,
            size * 0.20,
            size * 0.20
        );

        line(
            0,
            -size * 0.40,
            -size * 0.20,
            -size * 0.20
        );

        line(
            0,
            -size * 0.40,
            size * 0.20,
            -size * 0.20
        );
    } else if (
        eventId === "swap"
    ) {
        line(
            -size * 0.38,
            size * 0.18,
            size * 0.34,
            size * 0.18
        );

        line(
            size * 0.34,
            size * 0.18,
            size * 0.15,
            size * 0.34
        );

        line(
            size * 0.34,
            size * 0.18,
            size * 0.15,
            0
        );

        line(
            size * 0.38,
            -size * 0.18,
            -size * 0.34,
            -size * 0.18
        );

        line(
            -size * 0.34,
            -size * 0.18,
            -size * 0.15,
            0
        );

        line(
            -size * 0.34,
            -size * 0.18,
            -size * 0.15,
            -size * 0.34
        );
    } else if (
        eventId === "spill"
    ) {
        rectMode(CENTER);

        rect(
            -size * 0.08,
            0,
            size * 0.52,
            size * 0.58,
            size * 0.06
        );

        rectMode(CORNER);

        noStroke();

        fill(
            220,
            245,
            255,
            iconAlpha
        );

        ellipse(
            size * 0.32,
            size * 0.27,
            size * 0.24
        );

        noFill();

        stroke(
            255,
            248,
            235,
            iconAlpha
        );

        strokeWidth(
            Math.max(
                2,
                size * 0.09
            )
        );

        line(
            size * 0.16,
            size * 0.08,
            size * 0.31,
            size * 0.21
        );
    }

    noStroke();
    popMatrix();
}

