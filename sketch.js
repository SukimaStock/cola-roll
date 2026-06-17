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

    if (gameState.phase === "WAIT_CAP_POWER") {
        updateCapPower();
    }

    if (gameState.phase === "WAIT_BRANCH_PREVIEW") {
        updateBranchGauge();
    }

    updateCarbonationParticles();
    updateBoardCamera();
    drawPreviewScreen();
}





function touched(touch) {
    if (touch.state !== ENDED) {
        return;
    }

    if (
        touch.x > WIDTH - 82 &&
        touch.y > HEIGHT - 58
    ) {
        gameState.language =
            gameState.language === "ja"
                ? "en"
                : "ja";

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
        lockCapPower();
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
    let distance = 1;
    let isOverPower = false;

    const randomValue = Math.random();

    if (power >= CONFIG.capOverStart) {
        isOverPower = true;

        if (randomValue < 0.25) {
            distance = 1;
        } else if (randomValue < 0.60) {
            distance = 2;
        } else {
            distance = 3;
        }
    } else if (power < CONFIG.capPowerZone1End) {
        if (
            power >
            CONFIG.capPowerZone1End -
                CONFIG.capBoundaryMargin
        ) {
            distance =
                randomValue < 0.5
                    ? 1
                    : 2;
        } else {
            distance =
                randomValue < 0.85
                    ? 1
                    : 2;
        }
    } else if (power < CONFIG.capPowerZone2End) {
        if (
            power <
            CONFIG.capPowerZone1End +
                CONFIG.capBoundaryMargin
        ) {
            distance =
                randomValue < 0.5
                    ? 1
                    : 2;
        } else if (
            power >
            CONFIG.capPowerZone2End -
                CONFIG.capBoundaryMargin
        ) {
            distance =
                randomValue < 0.5
                    ? 2
                    : 3;
        } else {
            distance = 2;

            if (randomValue < 0.1) {
                distance = 1;
            } else if (randomValue > 0.9) {
                distance = 3;
            }
        }
    } else {
        if (
            power <
            CONFIG.capPowerZone2End +
                CONFIG.capBoundaryMargin
        ) {
            distance =
                randomValue < 0.5
                    ? 2
                    : 3;
        } else {
            distance =
                randomValue < 0.85
                    ? 3
                    : 2;
        }
    }

    return {
        distance: distance,
        isOverPower: isOverPower,
    };
}

function lockCapPower() {
    const cap = gameState.cap;
    const panel = layout.cap;

    cap.lockedPower = cap.power;

    const result = resolveCapDistance(
        cap.lockedPower
    );

    cap.distance = result.distance;
    cap.isOverPower = result.isOverPower;

    const laneX = panel.w * 0.50;
    const laneBottom = panel.h * 0.34;
    const laneTop = panel.h * 0.78;
    const zoneGap =
        (laneTop - laneBottom) / 2;

    const finalY =
        laneBottom +
        (cap.distance - 1) *
            zoneGap;

    const launchY = panel.h * 0.17;

    const targetX =
        laneX +
        Math.random() * 10 -
        5;

    cap.x = laneX;
    cap.y = launchY;
    cap.rotation = 0;

    gameState.phase = "CAP_FLYING";

    const showResult = function() {
        gameState.phase = "CAP_POWER_RESULT";

        const timer = {
            value: 0,
        };

        tween(
            CONFIG.capResultHoldDuration,
            timer,
            {
                value: 1,
            },
            tween.easing.linear,
            function() {
                startMoveCounterTransfer();
            }
        );
    };

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
    } else {
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
}

function startMoveCounterTransfer() {
    const panel = layout.cap;
    const counter = gameState.moveCounter;
    const cap = gameState.cap;

    counter.visible = true;
    counter.displayValue = cap.distance;
    counter.alpha = 255;
    counter.scale = 1.08;
    counter.x =
        panel.x +
        panel.w * 0.80;
    counter.y =
        panel.y +
        panel.h * 0.55;

    gameState.moveTotal =
        cap.distance;

    gameState.phase =
        "TRANSFERRING_MOVE_COUNT";

    const targetX =
        layout.board.x +
        layout.board.w -
        34;

    const targetY =
        layout.board.y +
        layout.board.h -
        34;

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
    const cap = gameState.cap;
    const panel = layout.cap;

    cap.power = 0;
    cap.powerDirection = 1;
    cap.lockedPower = 0;
    cap.isOverPower = false;
    cap.x = panel.w * 0.50;
    cap.y = panel.h * 0.17;
    cap.rotation = 0;
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

    let nextNodeId =
        currentNode.next;

    if (currentNode.choices) {
        const selectedChoiceId =
            gameState.selectedRoutes[
                currentNode.id
            ];

        if (!selectedChoiceId) {
            startBranchChoice(
                currentNode
            );

            return;
        }

        let selectedChoice = null;

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
            startBranchChoice(
                currentNode
            );

            return;
        }

        nextNodeId =
            selectedChoice.next;
    }

    if (
        gameState.remainingSteps <= 0
    ) {
        finishMovement();
        return;
    }

    if (!nextNodeId) {
        gameState.remainingSteps = 0;

        gameState.moveCounter.displayValue =
            0;

        finishMovement();
        return;
    }

    const targetNode =
        BOARD_NODES[nextNodeId];

    if (!targetNode) {
        gameState.remainingSteps = 0;

        gameState.moveCounter.displayValue =
            0;

        finishMovement();
        return;
    }

    gameState.targetNodeId =
        targetNode.id;

    gameState.moveAnimation.progress = 0;
    gameState.phase = "MOVING";

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

            gameState.targetNodeId = null;
            gameState.moveAnimation.progress = 0;

            gameState.remainingSteps =
                Math.max(
                    0,
                    gameState.remainingSteps - 1
                );

            animateMoveCounterDecrease(
                function() {
                    moveOneStep();
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



function completeIngredientAddition(ingredientId) {
    if (
        gameState.glass.slots.length >=
        CONFIG.glassCapacity
    ) {
        const spilled =
            gameState.glass.slots.pop();

        if (spilled) {
            gameState.glass.spilledTokens.push(
                spilled
            );
        }
    }

    const token = {
        uid:
            gameState.nextTokenUid,
        ingredientId: ingredientId,
    };

    gameState.nextTokenUid += 1;

    gameState.glass.slots.push(
        token
    );

    gameState.flyingIngredient = null;
    gameState.phase = "ADDING_TOKEN";

    gameState.glassPulse.scale = 0.88;

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
    CONFIG.capGaugeSpeed = 1.2;
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
}









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
    const capW = (WIDTH - margin * 3) * 0.60;

    layout = {
      board: {
        x: margin,
        y: lowerH + margin * 2,
        w: WIDTH - margin * 2,
        h: HEIGHT - lowerH - margin * 3,
      },

      cap: {
        x: margin,
        y: margin,
        w: capW,
        h: lowerH,
      },

      glass: {
        x: margin * 2 + capW,
        y: margin,
        w: WIDTH - capW - margin * 3,
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

  const start = BOARD_NODES[gameState.currentNodeId];

  gameState.camera.x = start.nx * CONFIG.mapWidth;
  gameState.camera.y =
    start.ny * CONFIG.mapHeight +
    CONFIG.cameraLookAheadY;

  gameState.camera.zoom = portrait ? 0.86 : 1.0;
}

function drawTitle() {
  drawLanguageButton();

  fill(245, 238, 228);
  noStroke();

  fontSize(Math.min(42, WIDTH * 0.095));
  textAlign(CENTER);

  text(
    TEXT[gameState.language].title,
    WIDTH / 2,
    HEIGHT * 0.60,
  );

  const cx = WIDTH / 2;
  const cy = HEIGHT * 0.39;

  const bob =
    Math.sin(ElapsedTime * 3) *
    8;

  const rot =
    Math.sin(ElapsedTime * 2) *
    12;

  noFill();
  stroke(220, 205, 190, 70);
  strokeWidth(2);

  ellipse(
    cx,
    cy + bob,
    64 + Math.sin(ElapsedTime * 4) * 8,
  );

  noStroke();

  drawCap(
    cx,
    cy + bob,
    rot,
    34,
  );
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
    drawMoveCounter();
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
  fill(220, 214, 205, 190);
  noStroke();

  fontSize(14);
  textAlign(RIGHT);

  text(
    TEXT[gameState.language].langButton,
    WIDTH - 24,
    HEIGHT - 28,
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
    const panel = layout.cap;
    const cap = gameState.cap;

    drawPanelFrame(panel);

    const movementActive =
        gameState.phase === "MOVING" ||
        gameState.phase === "MOVE_COUNT_TICK" ||
        gameState.phase === "MOVE_COUNT_ZERO" ||
        gameState.phase === "LANDING" ||
        gameState.phase === "WAIT_BRANCH_PREVIEW";

    if (movementActive) {
        return;
    }

    pushMatrix();
    translate(
        panel.x,
        panel.y
    );

    const isFlying =
        gameState.phase ===
        "CAP_FLYING";

    const resultVisible =
        gameState.phase ===
        "CAP_POWER_RESULT";

    const isTransferring =
        gameState.phase ===
        "TRANSFERRING_MOVE_COUNT";

    const powerLocked =
        isFlying ||
        resultVisible ||
        isTransferring;

    const laneX =
        panel.w * 0.50;

    const laneBottom =
        panel.h * 0.34;

    const laneTop =
        panel.h * 0.78;

    const zoneGap =
        (laneTop - laneBottom) / 2;

    const zoneW = Math.min(
        76,
        panel.w * 0.24
    );

    const zoneH = Math.max(
        28,
        Math.min(
            42,
            panel.h * 0.17
        )
    );

    fill(230, 220, 210, 20);
    rectMode(CENTER);

    rect(
        laneX,
        (laneBottom + laneTop) / 2,
        zoneW + 18,
        laneTop -
            laneBottom +
            zoneH +
            12,
        12
    );

    for (
        let distance = 1;
        distance <= 3;
        distance += 1
    ) {
        const zoneY =
            laneBottom +
            (distance - 1) *
                zoneGap;

        const selected =
            (
                resultVisible ||
                isTransferring
            ) &&
            cap.distance === distance;

        if (selected) {
            const pulse =
                1 +
                Math.sin(
                    ElapsedTime * 12
                ) *
                    0.05;

            fill(
                235,
                184,
                95,
                isTransferring
                    ? 95
                    : 175
            );

            rect(
                laneX,
                zoneY,
                zoneW * pulse,
                zoneH * pulse,
                8
            );

            noFill();

            stroke(
                255,
                226,
                160,
                isTransferring
                    ? 100
                    : 220
            );

            strokeWidth(3);

            rect(
                laneX,
                zoneY,
                zoneW + 8,
                zoneH + 8,
                10
            );

            noStroke();
        } else {
            fill(
                220,
                210,
                200,
                48
            );

            rect(
                laneX,
                zoneY,
                zoneW,
                zoneH,
                8
            );
        }

        if (selected) {
            fill(
                255,
                245,
                220,
                255
            );
        } else {
            fill(
                245,
                238,
                228,
                210
            );
        }

        fontSize(
            Math.min(
                selected ? 24 : 20,
                zoneH * 0.66
            )
        );

        textAlign(CENTER);

        text(
            String(distance),
            laneX,
            zoneY
        );
    }

    const launchY =
        panel.h * 0.17;

    if (
        isFlying ||
        resultVisible ||
        isTransferring
    ) {
        if (isFlying) {
            noFill();

            if (cap.isOverPower) {
                stroke(
                    245,
                    95,
                    85,
                    85
                );
            } else {
                stroke(
                    255,
                    225,
                    165,
                    75
                );
            }

            strokeWidth(2);

            ellipse(
                cap.x,
                cap.y,
                CONFIG.capSize * 1.65
            );

            noStroke();
        }

        drawCap(
            cap.x,
            cap.y,
            cap.rotation,
            Math.min(
                CONFIG.capSize,
                panel.h * 0.15
            )
        );
    } else {
        drawCap(
            laneX,
            launchY,
            0,
            Math.min(
                CONFIG.capSize,
                panel.h * 0.15
            )
        );
    }

    const gaugeW =
        panel.w * 0.76;

    const gaugeH = Math.max(
        14,
        Math.min(
            20,
            panel.h * 0.08
        )
    );

    const gaugeX =
        panel.w * 0.12;

    const gaugeY =
        panel.h * 0.09;

    const currentPower =
        powerLocked
            ? cap.lockedPower
            : cap.power;

    rectMode(CORNER);
    noStroke();

    drawGaugeZone(
        gaugeX,
        gaugeY,
        gaugeW * 0.28,
        gaugeH,
        currentPower <
            CONFIG.capPowerZone1End,
        color(88, 80, 55),
        color(145, 133, 78),
        true,
        false
    );

    drawGaugeZone(
        gaugeX +
            gaugeW * 0.28,
        gaugeY,
        gaugeW * 0.34,
        gaugeH,
        currentPower >=
            CONFIG.capPowerZone1End &&
            currentPower <
                CONFIG.capPowerZone2End,
        color(145, 96, 35),
        color(205, 145, 55),
        false,
        false
    );

    drawGaugeZone(
        gaugeX +
            gaugeW * 0.62,
        gaugeY,
        gaugeW * 0.28,
        gaugeH,
        currentPower >=
            CONFIG.capPowerZone2End &&
            currentPower <
                CONFIG.capPowerZone3End,
        color(180, 75, 25),
        color(235, 105, 35),
        false,
        false
    );

    drawGaugeZone(
        gaugeX +
            gaugeW * 0.90,
        gaugeY,
        gaugeW * 0.10,
        gaugeH,
        currentPower >=
            CONFIG.capPowerZone3End,
        color(145, 35, 35),
        color(235, 65, 60),
        false,
        true
    );

    fill(245, 238, 228);
    rectMode(CENTER);

    rect(
        gaugeX +
            gaugeW *
                currentPower,
        gaugeY +
            gaugeH / 2,
        powerLocked
            ? 5
            : 3,
        gaugeH + 8,
        2
    );

    if (resultVisible) {
        const resultX =
            panel.w * 0.80;

        const resultY =
            panel.h * 0.55;

        if (cap.isOverPower) {
            fill(
                245,
                100,
                90,
                255
            );
        } else {
            fill(
                255,
                226,
                160,
                255
            );
        }

        fontSize(
            Math.min(
                54,
                panel.w * 0.14
            )
        );

        textAlign(CENTER);

        text(
            String(
                cap.distance
            ),
            resultX,
            resultY
        );

        noFill();

        if (cap.isOverPower) {
            stroke(
                245,
                100,
                90,
                100
            );
        } else {
            stroke(
                255,
                226,
                160,
                100
            );
        }

        strokeWidth(2);

        ellipse(
            resultX,
            resultY,
            62 +
                Math.sin(
                    ElapsedTime * 10
                ) *
                    6
        );

        noStroke();
    }

    rectMode(CORNER);
    popMatrix();
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
            token.drawY ===
            undefined
                ? baseY
                : token.drawY;

        const tokenX =
            token.drawX ===
            undefined
                ? 0
                : token.drawX;

        const tokenRotation =
            token.rot ===
            undefined
                ? 0
                : token.rot;

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

        if (
            isTop &&
            !eventAction
        ) {
            drawAromaLines(
                0,
                30
            );
        }

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

