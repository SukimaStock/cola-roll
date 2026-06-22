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

var ROUND = "round";
var SQUARE = "square";
var PROJECT = "project";

let lastLayoutWidth = 0;
let lastLayoutHeight = 0;

function setup() {
    rectMode(CORNER);
    ellipseMode(CENTER);
    textAlign(CENTER);
    initializeGameFonts();

    installGameDebugErrorOverlay();

    const workLabel = typeof document !== "undefined"
        ? document.getElementById("workLabel")
        : null;

    if (workLabel) {
        workLabel.style.display = "none";
    }

    initGameData();
    applyBottleProductionTerminology();
    applyBoardReadabilityConfig();
    applyFactoryLineBoardLayout();
    initCapPowerConfig();
    initGameState();
    updateLayout(true);

    gameState.debugLastPhase =
        gameState.phase;

    gameState.debugLastError =
        null;
}


function initializeGameFonts() {
    if (
        typeof document !== "undefined" &&
        !document.getElementById("colaRollGoogleFonts")
    ) {
        const fontLink = document.createElement("link");
        fontLink.id = "colaRollGoogleFonts";
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=Kaisei+Decol:wght@400;500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap";
        document.head.appendChild(fontLink);
    }

    setGameUIFont();
}

function setGameUIFont() {
    if (typeof CodeaLite === "undefined" || !CodeaLite.state) {
        return;
    }

    CodeaLite.state.fontName =
        '"Zen Kaku Gothic New", "Hiragino Sans", "Noto Sans JP", sans-serif';
}

function strokeCap(
    mode
) {
    const nativeContext =
        typeof CodeaLite !==
            "undefined" &&
        CodeaLite.state
            ? CodeaLite.state.ctx
            : null;

    if (!nativeContext) {
        return;
    }

    let capStyle =
        "butt";

    if (
        mode === "round" ||
        mode === "ROUND" ||
        mode === ROUND
    ) {
        capStyle =
            "round";
    } else if (
        mode === "square" ||
        mode === "SQUARE" ||
        mode === SQUARE
    ) {
        capStyle =
            "square";
    } else if (
        mode === "project" ||
        mode === "PROJECT" ||
        mode === PROJECT
    ) {
        capStyle =
            "square";
    }

    nativeContext.lineCap =
        capStyle;
}



function setGameTitleFont() {
    if (typeof CodeaLite === "undefined" || !CodeaLite.state) {
        return;
    }

    CodeaLite.state.fontName =
        '"Kaisei Decol", "Yu Mincho", "Hiragino Mincho ProN", serif';
}


function applyBottleProductionTerminology() {
    if (
        INGREDIENTS &&
        INGREDIENTS.ice
    ) {
        INGREDIENTS.ice.ja =
            "冷却";

        INGREDIENTS.ice.en =
            "Cooling";
    }

    if (
        TEXT &&
        TEXT.ja
    ) {
        TEXT.ja.stir =
            "シェイク";
    }

    if (
        TEXT &&
        TEXT.en
    ) {
        TEXT.en.stir =
            "SHAKE";
    }
}


function resized() {
  updateLayout(true);
}

function drawColaAmbientBackground() {
    const stripeCount =
        44;

    const topColor = {
        r: 22,
        g: 18,
        b: 18,
    };

    const middleColor = {
        r: 34,
        g: 22,
        b: 18,
    };

    const bottomColor = {
        r: 53,
        g: 29,
        b: 18,
    };

    noStroke();
    rectMode(CORNER);

    for (
        let index = 0;
        index < stripeCount;
        index += 1
    ) {
        const startRatio =
            index /
            stripeCount;

        const endRatio =
            (
                index + 1
            ) /
            stripeCount;

        const ratio =
            (
                startRatio +
                endRatio
            ) *
            0.5;

        let r;
        let g;
        let b;

        if (
            ratio < 0.56
        ) {
            const localRatio =
                ratio /
                0.56;

            r =
                topColor.r +
                (
                    middleColor.r -
                    topColor.r
                ) *
                    localRatio;

            g =
                topColor.g +
                (
                    middleColor.g -
                    topColor.g
                ) *
                    localRatio;

            b =
                topColor.b +
                (
                    middleColor.b -
                    topColor.b
                ) *
                    localRatio;
        } else {
            const localRatio =
                (
                    ratio - 0.56
                ) /
                0.44;

            r =
                middleColor.r +
                (
                    bottomColor.r -
                    middleColor.r
                ) *
                    localRatio;

            g =
                middleColor.g +
                (
                    bottomColor.g -
                    middleColor.g
                ) *
                    localRatio;

            b =
                middleColor.b +
                (
                    bottomColor.b -
                    middleColor.b
                ) *
                    localRatio;
        }

        fill(
            r,
            g,
            b
        );

        rect(
            0,
            HEIGHT * startRatio,
            WIDTH,
            HEIGHT *
                (
                    endRatio -
                    startRatio
                ) +
                1
        );
    }

    noStroke();
    rectMode(CORNER);
}


function draw() {
    try {
        if (
            gameState
        ) {
            gameState.debugLastPhase =
                gameState.phase;
        }

        updateLayout(false);
        drawColaAmbientBackground();

        const titleTransitionActive =
            gameState &&
            gameState.titleTransition &&
            gameState.titleTransition.active;

        if (titleTransitionActive) {
            updateTitleStartTransition();
        }

        if (
            typeof updateIngredientGetEffect ===
            "function"
        ) {
            updateIngredientGetEffect();
        }

        if (
            typeof updateCapacitySpillFlow ===
            "function"
        ) {
            updateCapacitySpillFlow();
        }

        if (
            gameState.phase === "TITLE" ||
            gameState.phase === "TITLE_TRANSITION"
        ) {
            drawTitle();
            drawTitleStartTransition();
            drawGameDebugErrorOverlay();
            return;
        }

        updateCarbonationParticles();

        if (gameState.phase === "RESULT") {
            drawGoalResultHandoffUnderlay();
            drawResultScreen();
            drawResultFizzTransition();
            drawTitleStartTransition();
            drawGameDebugErrorOverlay();
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

        updateBoardCamera();
        drawPreviewScreen();
        drawTitleStartTransition();
        drawGameDebugErrorOverlay();
    } catch (error) {
        captureGameDebugError(
            error,
            "draw"
        );

        drawEmergencyDebugScreen();
    }
}



function drawGoalResultHandoffUnderlay() {
    const effect =
        gameState.goalEffect;

    if (
        !effect ||
        !effect.visible ||
        effect.stage !== "handoff"
    ) {
        return;
    }

    drawBoardPanel();
    drawGoalArrivalOverlay();
}



function installGameDebugErrorOverlay() {
    if (
        typeof window === "undefined"
    ) {
        return;
    }

    if (
        window.__colaRollDebugInstalled
    ) {
        return;
    }

    window.__colaRollDebugInstalled =
        true;

    window.onerror = function(
        message,
        source,
        lineno,
        colno,
        error
    ) {
        const errorObject =
            error || {
                message:
                    String(
                        message
                    ),
                stack:
                    source
                        ? (
                            String(source) +
                            ":" +
                            String(lineno) +
                            ":" +
                            String(colno)
                        )
                        : "",
            };

        captureGameDebugError(
            errorObject,
            "window.onerror"
        );

        return false;
    };

    window.onunhandledrejection = function(
        event
    ) {
        const reason =
            event && event.reason
                ? event.reason
                : {
                    message:
                        "Unhandled promise rejection",
                    stack:
                        "",
                };

        captureGameDebugError(
            reason,
            "unhandledrejection"
        );
    };
}

function captureGameDebugError(
    error,
    location
) {
    if (!gameState) {
        return;
    }

    const message =
        error && error.message
            ? error.message
            : String(error);

    const stack =
        error && error.stack
            ? String(error.stack)
            : "";

    gameState.debugLastError = {
        message:
            message,
        stack:
            stack,
        location:
            location || "unknown",
        phase:
            gameState.phase || "unknown",
        time:
            typeof ElapsedTime !== "undefined"
                ? ElapsedTime
                : 0,
        slots:
            gameState.glass &&
            gameState.glass.slots
                ? gameState.glass.slots.length
                : -1,
        capacity:
            CONFIG &&
            CONFIG.glassCapacity
                ? CONFIG.glassCapacity
                : -1,
        ingredientEffectKind:
            gameState.ingredientGetEffect
                ? gameState.ingredientGetEffect.kind || ""
                : "",
        ingredientEffectId:
            gameState.ingredientGetEffect
                ? gameState.ingredientGetEffect.ingredientId || ""
                : "",
        ingredientEffectVisible:
            gameState.ingredientGetEffect
                ? !!gameState.ingredientGetEffect.visible
                : false,
    };

    if (
        typeof console !== "undefined" &&
        console.error
    ) {
        console.error(
            "[COLA ROLL DEBUG]",
            gameState.debugLastError
        );
    }
}

function drawGameDebugErrorOverlay() {
    if (
        !gameState ||
        !gameState.debugLastError
    ) {
        return;
    }

    const errorInfo =
        gameState.debugLastError;

    rectMode(CORNER);
    noStroke();

    fill(
        20,
        4,
        4,
        232
    );

    rect(
        8,
        HEIGHT - 168,
        Math.min(
            WIDTH - 16,
            520
        ),
        158,
        8
    );

    fill(
        255,
        210,
        170,
        255
    );

    textAlign(LEFT);

    fontSize(12);

    text(
        "DEBUG ERROR",
        20,
        HEIGHT - 30
    );

    fill(
        255,
        245,
        220,
        255
    );

    fontSize(11);

    text(
        "where: " +
            errorInfo.location,
        20,
        HEIGHT - 50
    );

    text(
        "phase: " +
            errorInfo.phase +
            " / slots: " +
            String(errorInfo.slots) +
            "/" +
            String(errorInfo.capacity),
        20,
        HEIGHT - 68
    );

    text(
        "popup: " +
            String(errorInfo.ingredientEffectKind) +
            " " +
            String(errorInfo.ingredientEffectId) +
            " visible=" +
            String(errorInfo.ingredientEffectVisible),
        20,
        HEIGHT - 86
    );

    text(
        "msg: " +
            String(errorInfo.message).slice(
                0,
                72
            ),
        20,
        HEIGHT - 104
    );

    const firstStackLine =
        errorInfo.stack
            ? String(errorInfo.stack).split(
                "\n"
            )[0]
            : "";

    text(
        "stack: " +
            firstStackLine.slice(
                0,
                72
            ),
        20,
        HEIGHT - 122
    );

    text(
        "Open browser console for full object.",
        20,
        HEIGHT - 146
    );

    textAlign(CENTER);
}

function drawEmergencyDebugScreen() {
    background(
        28,
        8,
        8
    );

    rectMode(CORNER);
    noStroke();

    fill(
        255,
        236,
        202,
        255
    );

    textAlign(LEFT);

    fontSize(14);

    text(
        "COLA ROLL stopped with a JavaScript error.",
        18,
        HEIGHT - 28
    );

    const errorInfo =
        gameState &&
        gameState.debugLastError
            ? gameState.debugLastError
            : null;

    if (!errorInfo) {
        text(
            "No error info captured.",
            18,
            HEIGHT - 56
        );

        textAlign(CENTER);
        return;
    }

    fontSize(12);

    text(
        "where: " +
            errorInfo.location,
        18,
        HEIGHT - 58
    );

    text(
        "phase: " +
            errorInfo.phase,
        18,
        HEIGHT - 78
    );

    text(
        "slots: " +
            String(errorInfo.slots) +
            "/" +
            String(errorInfo.capacity),
        18,
        HEIGHT - 98
    );

    text(
        "popup: " +
            String(errorInfo.ingredientEffectKind) +
            " " +
            String(errorInfo.ingredientEffectId),
        18,
        HEIGHT - 118
    );

    text(
        "message:",
        18,
        HEIGHT - 146
    );

    text(
        String(errorInfo.message).slice(
            0,
            88
        ),
        18,
        HEIGHT - 166
    );

    const stackLine =
        errorInfo.stack
            ? String(errorInfo.stack).split(
                "\n"
            )[0]
            : "";

    text(
        "stack:",
        18,
        HEIGHT - 196
    );

    text(
        stackLine.slice(
            0,
            88
        ),
        18,
        HEIGHT - 216
    );

    textAlign(CENTER);
}


function touched(touch) {
    try {
        if (touch.state !== ENDED) {
            return;
        }

        const languageButton =
            getLanguageButtonRect();

        if (
            gameState.phase === "TITLE" &&
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

        if (
            gameState.phase ===
            "TITLE_TRANSITION"
        ) {
            return;
        }

        if (gameState.phase === "RESULT") {
            const ingredientHit =
                getResultIngredientHitAt(
                    touch.x,
                    touch.y
                );

            if (ingredientHit) {
                showResultIngredientTooltip(
                    ingredientHit
                );

                return;
            }

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
            startTitleTransition();
            return;
        }

        if (
            gameState.phase ===
                "WAIT_EVENT_ROLL" &&
            pointInsidePanel(
                touch.x,
                touch.y,
                layout.cap
            )
        ) {
            rollEventDice();
            return;
        }

        if (
            gameState.phase ===
                "WAIT_MYSTERY_ROLL" &&
            pointInsidePanel(
                touch.x,
                touch.y,
                layout.cap
            )
        ) {
            startMysteryRoulette();
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
    } catch (error) {
        captureGameDebugError(
            error,
            "touched"
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
    const width = 54;
    const height = 22;
    const margin = 8;

    const resultOffset =
        gameState.phase === "RESULT"
            ? 44
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
            if (
                steps === 0 ||
                steps < maxSteps
            ) {
                return node;
            }

            return null;
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

const resetCapAfterResultBase =
    resetCapAfterResult;

resetCapAfterResult = function() {
    const resultDistance =
        typeof gameState.moveTotal ===
        "number"
            ? gameState.moveTotal
            : null;

    resetCapAfterResultBase();

    if (
        resultDistance !== null
    ) {
        gameState.cap.distance =
            resultDistance;
    }
};



function startBoardMovement(distance) {
    gameState.remainingSteps =
        distance;

    gameState.moveCounter.displayValue =
        distance;

    gameState.exactStopEligible =
        true;

    gameState.exactStopStartDistance =
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

    if (
        gameState.remainingSteps <=
        0
    ) {
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

        }

        nextNodeId =
            selectedChoice.next;
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
                        gameState.exactStopEligible =
                            false;

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

    const currentNode =
        BOARD_NODES[
            gameState.currentNodeId
        ];

    const reachedGoal =
        currentNode &&
        currentNode.id === "goal";

    if (
        reachedGoal &&
        gameState.remainingSteps > 0
    ) {
        gameState.exactStopEligible =
            false;
    }

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

    let counterFinished =
        false;

    let impactFinished =
        false;

    let landingStarted =
        false;

    const continueLanding =
        function() {
            if (
                landingStarted ||
                !counterFinished ||
                !impactFinished
            ) {
                return;
            }

            landingStarted =
                true;

            registerExactStopBonus();

            resolveLandingTile();
        };

    gameState.phase =
        "LANDING";

    startLandingImpactEffect(
        function() {
            impactFinished =
                true;

            continueLanding();
        }
    );

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
                    counter.visible =
                        false;

                    counter.scale =
                        0.72;

                    counter.alpha =
                        255;

                    counterFinished =
                        true;

                    continueLanding();
                }
            );
        }
    );
}


function startLandingImpactEffect(onComplete) {
    const node =
        BOARD_NODES[
            gameState.currentNodeId
        ];

    if (!node) {
        if (onComplete) {
            onComplete();
        }

        return;
    }

    const effect = {
        visible: true,
        nodeId: node.id,
        progress: 0,
        impact: 0,
        alpha: 255,
        completed: false,
    };

    gameState.landingImpact =
        effect;

    gameState.landingPulse =
        1;

    tween(
        0.14,
        effect,
        {
            progress: 0.16,
            impact: 1,
        },
        tween.easing.bounceOut,
        function() {
            tween(
                0.32,
                effect,
                {
                    progress: 1,
                    alpha: 0,
                },
                tween.easing.quadOut,
                function() {
                    effect.visible =
                        false;

                    effect.completed =
                        true;

                    gameState.landingImpact =
                        null;

                    if (onComplete) {
                        onComplete();
                    }
                }
            );
        }
    );
}

function getLandingImpactAccent(node) {
    if (
        node &&
        node.id === "goal"
    ) {
        return {
            r: 255,
            g: 209,
            b: 104,
        };
    }

    if (
        typeof getBoardStationType ===
            "function" &&
        typeof getBoardStationActivationColor ===
            "function"
    ) {
        const stationType =
            getBoardStationType(
                node
            );

        const accent =
            getBoardStationActivationColor(
                node,
                stationType
            );

        if (accent) {
            return accent;
        }
    }

    return {
        r: 239,
        g: 173,
        b: 91,
    };
}

function drawLandingImpactEffect() {
    const effect =
        gameState.landingImpact;

    if (
        !effect ||
        !effect.visible ||
        !effect.nodeId
    ) {
        return;
    }

    const node =
        BOARD_NODES[
            effect.nodeId
        ];

    if (!node) {
        return;
    }

    const position =
        getBoardNodeScreenPosition(
            effect.nodeId
        );

    const accent =
        getLandingImpactAccent(
            node
        );

    const progress =
        Math.max(
            0,
            Math.min(
                1,
                effect.progress
            )
        );

    const impact =
        Math.max(
            0,
            Math.min(
                1,
                effect.impact
            )
        );

    const alpha =
        Math.max(
            0,
            Math.min(
                255,
                effect.alpha
            )
        );

    const baseSize =
        CONFIG.currentNodeSize;

    const ringSize =
        baseSize *
        (
            0.96 +
            progress * 2.15
        );

    const innerRingSize =
        baseSize *
        (
            0.64 +
            progress * 1.26
        );

    const flashSize =
        baseSize *
        (
            0.54 +
            impact * 0.88
        );

    noStroke();

    fill(
        accent.r,
        accent.g,
        accent.b,
        alpha *
            (
                0.16 +
                impact * 0.14
            )
    );

    ellipse(
        position.x,
        position.y -
            baseSize * 0.03,
        flashSize
    );

    noFill();

    stroke(
        accent.r,
        accent.g,
        accent.b,
        alpha *
            (
                0.68 -
                progress * 0.28
            )
    );

    strokeWidth(
        3.6 -
        progress * 1.4
    );

    ellipse(
        position.x,
        position.y,
        ringSize
    );

    stroke(
        255,
        238,
        191,
        alpha *
            (
                0.74 -
                progress * 0.34
            )
    );

    strokeWidth(
        1.8
    );

    ellipse(
        position.x,
        position.y,
        innerRingSize
    );

    noStroke();

    for (
        let index = 0;
        index < 8;
        index += 1
    ) {
        const angle =
            (
                Math.PI * 2 *
                index
            ) /
            8 -
            Math.PI * 0.5;

        const particleStart =
            baseSize * 0.28;

        const particleDistance =
            baseSize *
            (
                0.54 +
                progress * 1.22
            );

        const particleX =
            position.x +
            Math.cos(
                angle
            ) *
                (
                    particleStart +
                    particleDistance
                );

        const particleY =
            position.y +
            Math.sin(
                angle
            ) *
                (
                    particleStart +
                    particleDistance
                ) +
            progress *
                baseSize *
                0.16;

        const particleAlpha =
            alpha *
            Math.max(
                0,
                0.80 -
                    progress * 0.62
            );

        const particleSize =
            2.8 +
            (
                index % 3
            ) *
                0.9 +
            impact * 1.5;

        fill(
            accent.r,
            accent.g,
            accent.b,
            particleAlpha
        );

        ellipse(
            particleX,
            particleY,
            particleSize
        );
    }

    fill(
        255,
        250,
        222,
        alpha *
            (
                0.50 +
                impact * 0.28
            )
    );

    ellipse(
        position.x -
            baseSize * 0.16,
        position.y +
            baseSize * 0.10,
        3.4 +
            impact * 2
    );

    noStroke();
}


function registerExactStopBonus() {
    if (
        gameState.exactStopEligible ===
        false
    ) {
        return;
    }

    const node =
        BOARD_NODES[
            gameState.currentNodeId
        ];

    if (!node) {
        return;
    }

    const bonusNode =
        node.id === "goal" ||
        (
            node.choices &&
            node.choices.length > 0
        );

    if (!bonusNode) {
        return;
    }

    if (
        !gameState.perfectStopNodes
    ) {
        gameState.perfectStopNodes =
            {};
    }

    if (
        gameState.perfectStopNodes[
            node.id
        ]
    ) {
        return;
    }

    gameState.perfectStopNodes[
        node.id
    ] =
        true;

    gameState.perfectStopCount =
        (
            gameState.perfectStopCount ||
            0
        ) +
        1;

    if (
        node.id === "goal"
    ) {
        gameState.perfectGoalStop =
            true;
    }

    gameState.exactStopEffect = {
        visible: true,
        nodeId: node.id,
        progress: 0,
        alpha: 255,
        rotation: 0,
    };

    tween(
        0.62,
        gameState.exactStopEffect,
        {
            progress: 1,
            alpha: 0,
            rotation: 160,
        },
        tween.easing.quadOut,
        function() {
            if (
                gameState.exactStopEffect
            ) {
                gameState.exactStopEffect.visible =
                    false;
            }
        }
    );
}

function drawExactStopEffect() {
    drawLandingImpactEffect();

    const effect =
        gameState.exactStopEffect;

    if (
        !effect ||
        !effect.visible
    ) {
        return;
    }

    const position =
        getBoardNodeScreenPosition(
            effect.nodeId
        );

    const progress =
        effect.progress;

    const alpha =
        effect.alpha;

    const ringSize =
        36 +
        progress * 46;

    noFill();

    stroke(
        255,
        213,
        112,
        alpha
    );

    strokeWidth(
        3 -
        progress
    );

    ellipse(
        position.x,
        position.y,
        ringSize
    );

    stroke(
        255,
        238,
        181,
        alpha * 0.55
    );

    strokeWidth(1.5);

    ellipse(
        position.x,
        position.y,
        ringSize * 1.32
    );

    pushMatrix();

    translate(
        position.x,
        position.y
    );

    rotate(
        effect.rotation
    );

    for (
        let index = 0;
        index < 8;
        index += 1
    ) {
        rotate(45);

        line(
            ringSize * 0.42,
            0,
            ringSize * 0.58,
            0
        );
    }

    popMatrix();

    noStroke();
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

    startBoardStationActivation(
        node,
        function() {
            resolveLandingTileEffect(
                node
            );
        }
    );
}

function resolveLandingTileEffect(node) {
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
            const pressureDelta =
                node.effect.pressureDelta;

            const changePressureAfterGet =
                function() {
                    if (
                        pressureDelta > 0
                    ) {
                        gameState.totalCarbonationGets =
                            (
                                gameState.totalCarbonationGets ||
                                0
                            ) + 1;
                    }

                    changePressure(
                        pressureDelta,
                        finishEffect
                    );
                };

            if (
                pressureDelta > 0 &&
                typeof startCarbonationGetEffect ===
                    "function"
            ) {
                startCarbonationGetEffect(
                    changePressureAfterGet
                );

                return;
            }

            changePressureAfterGet();
            return;
        }

        finishEffect();
    };

    if (
        node.effect &&
        node.effect.garnish
    ) {
        const garnish =
            node.effect.garnish;

        startGarnishGetEffect(
            garnish,
            function() {
                gameState.glass.garnish =
                    garnish;

                applyPressure();
            }
        );

        return;
    }

    applyPressure();
}




function startBoardStationActivation(
    node,
    onComplete
) {
    const stationType =
        getBoardStationType(
            node
        );

    const directBottleProcess =
        stationType === "syrup" ||
        stationType === "spice" ||
        stationType === "cooling" ||
        stationType === "shake" ||
        stationType === "garnish";

    if (
        !stationType ||
        stationType === "bottle" ||
        stationType === "serve" ||
        directBottleProcess
    ) {
        if (onComplete) {
            onComplete();
        }

        return;
    }

    const effect =
        gameState.stationAnimation;

    effect.visible = true;
    effect.nodeId = node.id;
    effect.stationType =
        stationType;
    effect.progress = 0;
    effect.pulse = 0;
    effect.rotation = 0;
    effect.alpha = 255;

    const firstDuration =
        CONFIG.stationActivationDuration *
        0.38;

    const secondDuration =
        CONFIG.stationActivationDuration *
        0.62;

    tween(
        firstDuration,
        effect,
        {
            progress: 0.42,
            pulse: 1,
            rotation: 24,
        },
        tween.easing.quadOut,
        function() {
            tween(
                secondDuration,
                effect,
                {
                    progress: 1,
                    pulse: 0.28,
                    rotation: 42,
                },
                tween.easing.quadInOut,
                function() {
                    tween(
                        CONFIG.stationActivationSettleDuration,
                        effect,
                        {
                            pulse: 0,
                            alpha: 0,
                        },
                        tween.easing.quadOut,
                        function() {
                            effect.visible =
                                false;

                            effect.nodeId =
                                null;

                            effect.stationType =
                                null;

                            effect.progress =
                                0;

                            effect.rotation =
                                0;

                            effect.alpha =
                                0;

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


function getBoardStationActivationColor(
    node,
    stationType
) {
    if (
        node &&
        node.effect &&
        node.effect.addIngredient &&
        INGREDIENTS[
            node.effect.addIngredient
        ]
    ) {
        return INGREDIENTS[
            node.effect.addIngredient
        ].color;
    }

    if (
        stationType ===
        "carbonation"
    ) {
        return {
            r: 185,
            g: 232,
            b: 247,
        };
    }

    if (
        stationType ===
        "cooling"
    ) {
        return {
            r: 205,
            g: 241,
            b: 250,
        };
    }

    if (
        stationType ===
        "shake"
    ) {
        return {
            r: 240,
            g: 190,
            b: 116,
        };
    }

    if (
        stationType ===
        "mystery"
    ) {
        return {
            r: 211,
            g: 160,
            b: 222,
        };
    }

    if (
        stationType ===
            "garnish" &&
        node.effect &&
        node.effect.garnish ===
            "cherry"
    ) {
        return {
            r: 220,
            g: 68,
            b: 62,
        };
    }

    if (
        stationType ===
        "garnish"
    ) {
        return {
            r: 228,
            g: 222,
            b: 86,
        };
    }

    return {
        r: 233,
        g: 177,
        b: 101,
    };
}


function drawBoardStationActivation() {
    const effect =
        gameState.stationAnimation;

    if (
        !effect ||
        !effect.visible ||
        !effect.nodeId
    ) {
        return;
    }

    const node =
        BOARD_NODES[
            effect.nodeId
        ];

    if (!node) {
        return;
    }

    const position =
        getBoardNodeScreenPosition(
            node.id
        );

    const panel =
        layout.board;

    if (
        position.x <
            panel.x - 40 ||
        position.x >
            panel.x +
                panel.w +
                40 ||
        position.y <
            panel.y - 40 ||
        position.y >
            panel.y +
                panel.h +
                40
    ) {
        return;
    }

    const stationType =
        effect.stationType;

    const progress =
        Math.max(
            0,
            Math.min(
                1,
                effect.progress
            )
        );

    const pulse =
        effect.pulse;

    const alpha =
        effect.alpha;

    const accent =
        getBoardStationActivationColor(
            node,
            stationType
        );

    const ringSize =
        CONFIG.stationActivationRingSize *
        (
            0.82 +
            progress * 0.44 +
            pulse * 0.12
        );

    noFill();

    stroke(
        accent.r,
        accent.g,
        accent.b,
        alpha *
            (
                0.25 +
                pulse * 0.45
            )
    );

    strokeWidth(
        2 +
        pulse * 2
    );

    ellipse(
        position.x,
        position.y,
        ringSize
    );

    stroke(
        255,
        226,
        172,
        alpha *
            pulse *
            0.42
    );

    strokeWidth(1.5);

    ellipse(
        position.x,
        position.y,
        ringSize * 1.30
    );

    noStroke();

    pushMatrix();

    translate(
        position.x,
        position.y
    );

    if (
        stationType === "syrup" ||
        stationType === "spice"
    ) {
        const nozzleY =
            18 -
            progress * 7;

        fill(
            48,
            31,
            24,
            alpha
        );

        rectMode(CENTER);

        rect(
            0,
            nozzleY + 5,
            17,
            8,
            3
        );

        fill(
            184,
            124,
            69,
            alpha
        );

        rect(
            0,
            nozzleY,
            6,
            13,
            2
        );

        fill(
            235,
            183,
            104,
            alpha
        );

        rect(
            0,
            nozzleY - 7,
            10,
            3,
            1
        );

        const dropY =
            nozzleY -
            9 -
            progress *
                CONFIG.stationActivationDropDistance;

        fill(
            accent.r,
            accent.g,
            accent.b,
            alpha
        );

        ellipse(
            0,
            dropY,
            5 +
                pulse * 2
        );

        fill(
            accent.r,
            accent.g,
            accent.b,
            alpha * 0.55
        );

        ellipse(
            -5,
            dropY + 7,
            2.5
        );

        ellipse(
            5,
            dropY + 3,
            2
        );

        rectMode(CORNER);
    } else if (
        stationType === "carbonation"
    ) {
        const nozzleY =
            19 -
            progress * 11;

        rectMode(CENTER);

        fill(
            52,
            40,
            34,
            alpha
        );

        rect(
            0,
            nozzleY + 5,
            20,
            8,
            3
        );

        fill(
            177,
            126,
            73,
            alpha
        );

        rect(
            0,
            nozzleY - 2,
            7,
            15,
            2
        );

        fill(
            226,
            190,
            126,
            alpha
        );

        rect(
            0,
            nozzleY - 10,
            11,
            3,
            1
        );

        rectMode(CORNER);

        for (
            let index = 0;
            index < 6;
            index += 1
        ) {
            const bubbleProgress =
                (
                    progress +
                    index * 0.17
                ) %
                1;

            const bubbleX =
                Math.sin(
                    index * 2.4
                ) *
                8;

            const bubbleY =
                nozzleY -
                10 -
                bubbleProgress * 27;

            noFill();

            stroke(
                accent.r,
                accent.g,
                accent.b,
                alpha *
                    (
                        0.35 +
                        bubbleProgress *
                            0.55
                    )
            );

            strokeWidth(1.2);

            ellipse(
                bubbleX,
                bubbleY,
                3 +
                    (
                        index % 3
                    )
            );
        }

        noStroke();
    } else if (
        stationType === "ice"
    ) {
        pushMatrix();

        translate(
            0,
            13
        );

        rotate(
            -38 *
            progress
        );

        rectMode(CENTER);

        fill(
            52,
            63,
            67,
            alpha
        );

        rect(
            0,
            0,
            22,
            7,
            2
        );

        fill(
            180,
            215,
            224,
            alpha
        );

        rect(
            0,
            1,
            17,
            3,
            1
        );

        rectMode(CORNER);

        popMatrix();

        const cubeY =
            8 -
            progress *
                CONFIG.stationActivationDropDistance;

        pushMatrix();

        translate(
            0,
            cubeY
        );

        rotate(
            effect.rotation
        );

        rectMode(CENTER);

        fill(
            accent.r,
            accent.g,
            accent.b,
            alpha * 0.92
        );

        rect(
            0,
            0,
            10,
            10,
            2
        );

        noFill();

        stroke(
            246,
            255,
            255,
            alpha * 0.80
        );

        strokeWidth(1);

        rect(
            0,
            0,
            10,
            10,
            2
        );

        noStroke();
        rectMode(CORNER);

        popMatrix();
    } else if (
        stationType === "stir"
    ) {
        const armY =
            19 -
            progress * 10;

        stroke(
            42,
            28,
            22,
            alpha
        );

        strokeWidth(6);

        line(
            0,
            armY + 8,
            0,
            armY - 15
        );

        stroke(
            230,
            185,
            113,
            alpha
        );

        strokeWidth(3);

        line(
            0,
            armY + 8,
            0,
            armY - 15
        );

        pushMatrix();

        translate(
            0,
            armY - 15
        );

        rotate(
            effect.rotation
        );

        stroke(
            255,
            220,
            157,
            alpha
        );

        strokeWidth(3);

        line(
            -9,
            0,
            9,
            0
        );

        line(
            0,
            -6,
            0,
            6
        );

        noStroke();

        popMatrix();
    } else if (
        stationType === "mystery"
    ) {
        pushMatrix();

        translate(
            0,
            12 +
                progress * 4
        );

        rotate(
            -32 *
            progress
        );

        rectMode(CENTER);

        fill(
            78,
            48,
            86,
            alpha
        );

        rect(
            0,
            0,
            20,
            6,
            2
        );

        fill(
            210,
            158,
            222,
            alpha * 0.65
        );

        rect(
            0,
            1,
            15,
            2,
            1
        );

        rectMode(CORNER);

        popMatrix();

        for (
            let index = 0;
            index < 3;
            index += 1
        ) {
            const questionProgress =
                Math.max(
                    0,
                    progress -
                        index * 0.14
                );

            fill(
                accent.r,
                accent.g,
                accent.b,
                alpha *
                    questionProgress
            );

            fontSize(
                11 +
                index * 2
            );

            textAlign(CENTER);

            text(
                "?",
                (
                    index -
                    1
                ) *
                    9,
                4 -
                    questionProgress *
                        28
            );
        }
    } else if (
        stationType === "garnish"
    ) {
        pushMatrix();

        translate(
            0,
            11
        );

        rotate(
            (
                node.effect.garnish ===
                "cherry"
                    ? 1
                    : -1
            ) *
            25 *
            progress
        );

        rectMode(CENTER);

        fill(
            70,
            46,
            34,
            alpha
        );

        rect(
            0,
            0,
            22,
            7,
            3
        );

        fill(
            151,
            99,
            57,
            alpha
        );

        rect(
            0,
            1,
            17,
            3,
            1
        );

        rectMode(CORNER);

        popMatrix();

        const garnishY =
            7 -
            progress *
                CONFIG.stationActivationDropDistance;

        if (
            node.effect.garnish ===
            "cherry"
        ) {
            fill(
                accent.r,
                accent.g,
                accent.b,
                alpha
            );

            ellipse(
                0,
                garnishY,
                9
            );

            stroke(
                83,
                128,
                66,
                alpha
            );

            strokeWidth(1.5);

            line(
                1,
                garnishY + 4,
                6,
                garnishY + 10
            );

            noStroke();
        } else {
            noFill();

            stroke(
                accent.r,
                accent.g,
                accent.b,
                alpha
            );

            strokeWidth(4);

            ellipse(
                0,
                garnishY,
                11
            );

            stroke(
                83,
                129,
                66,
                alpha
            );

            strokeWidth(2);

            ellipse(
                0,
                garnishY,
                5
            );

            noStroke();
        }
    }

    popMatrix();

    noStroke();
    rectMode(CORNER);
}


function startGoalSequence() {
    gameState.phase =
        "GOAL_ARRIVAL";

    gameState.remainingSteps =
        0;

    gameState.moveCounter.visible =
        false;

    gameState.moveCounter.displayValue =
        0;

    createResultData();

    const effect =
        gameState.goalEffect;

    effect.visible =
        true;

    effect.stage =
        "cap";

    effect.scale =
        0.94;

    effect.alpha =
        0;

    effect.ring =
        0;

    effect.capProgress =
        0;

    effect.capRotation =
        -35;

    effect.press =
        0;

    effect.labelProgress =
        0;

    effect.complete =
        0;

    tween(
        0.22,
        effect,
        {
            scale: 1,
            alpha: 255,
            ring: 0.48,
            capProgress: 1,
            capRotation: 0,
        },
        tween.easing.bounceOut,
        function() {
            effect.stage =
                "press";

            tween(
                0.13,
                effect,
                {
                    scale: 1.07,
                    ring: 0.92,
                    press: 1,
                },
                tween.easing.quadOut,
                function() {
                    tween(
                        0.14,
                        effect,
                        {
                            scale: 1,
                            ring: 1.08,
                            press: 0.10,
                        },
                        tween.easing.bounceOut,
                        function() {
                            effect.stage =
                                "label";

                            tween(
                                0.24,
                                effect,
                                {
                                    labelProgress: 1,
                                    ring: 1.34,
                                },
                                tween.easing.quadOut,
                                function() {
                                    effect.stage =
                                        "handoff";

                                    effect.complete =
                                        1;

                                    effect.press =
                                        0;

                                    startResultScreen();

                                    tween(
                                        0.30,
                                        effect,
                                        {
                                            scale: 1.24,
                                            alpha: 0,
                                            ring: 2.32,
                                        },
                                        tween.easing.quadIn,
                                        function() {
                                            effect.visible =
                                                false;

                                            effect.stage =
                                                "idle";
                                        }
                                    );
                                }
                            );
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
    let strange = 0;
    let legacyIceCount = 0;

    const strangeIds = [];
    const ingredientIds = [];
    const ingredientCounts = [];
    const ingredientCountMap = {};

    let topIngredientId =
        null;

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

        if (
            ingredient.id ===
            "ice"
        ) {
            legacyIceCount += 1;
            continue;
        }

        sweetness +=
            ingredient.sweetness || 0;

        spice +=
            ingredient.spice || 0;

        strange +=
            ingredient.strange || 0;

        topIngredientId =
            ingredient.id;

        ingredientIds.push(
            ingredient.id
        );

        ingredientCountMap[
            ingredient.id
        ] =
            (
                ingredientCountMap[
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

    for (
        const ingredientId of
        Object.keys(
            ingredientCountMap
        )
    ) {
        ingredientCounts.push(
            {
                id:
                    ingredientId,

                count:
                    ingredientCountMap[
                        ingredientId
                    ],
            }
        );
    }

    const coolingCount =
        Math.min(
            CONFIG.coolingMaxLevel,
            (
                gameState.chillCount ||
                0
            ) +
            legacyIceCount
        );

    const carbonationGets =
        gameState.totalCarbonationGets ===
            undefined
            ? (
                gameState.glass.pressure > 0
                    ? gameState.glass.pressure
                    : 0
            )
            : gameState.totalCarbonationGets;

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

    const uniqueIngredientIds =
        Object.keys(
            ingredientCountMap
        );

    const colaBaseIds = [
        "base_syrup",
        "thick_syrup",
        "brown_sugar",
        "secret_syrup",
        "caramel",
    ];

    let hasColaBase =
        false;

    for (
        const ingredientId of
        uniqueIngredientIds
    ) {
        if (
            colaBaseIds.indexOf(
                ingredientId
            ) >= 0
        ) {
            hasColaBase = true;
            break;
        }
    }

    const hasFizz =
        carbonationGets > 0 ||
        gameState.glass.pressure > 0;

    const singleIngredientId =
        uniqueIngredientIds.length === 1
            ? uniqueIngredientIds[0]
            : null;

    let drinkType =
        "cola";

    if (hasColaBase) {
        drinkType =
            hasFizz
                ? "cola"
                : "syrup";
    } else if (
        uniqueIngredientIds.length === 0
    ) {
        drinkType =
            hasFizz
                ? "plain_soda"
                : "nothing";
    } else if (
        uniqueIngredientIds.length === 1
    ) {
        drinkType =
            hasFizz
                ? "single_soda"
                : "single";
    } else {
        drinkType =
            "scrap";
    }

    gameState.resultData = {
        topIngredientId:
            topIngredientId,

        ingredientIds:
            ingredientIds,

        ingredientCounts:
            ingredientCountMap,

        ingredientCountList:
            ingredientCounts,

        uniqueIngredientIds:
            uniqueIngredientIds,

        sweetness:
            sweetness,

        spice:
            spice,

        chill:
            coolingCount,

        strange:
            strange,

        iceCount:
            coolingCount,

        coolingCount:
            coolingCount,

        sweetnessLevel:
            sweetness >= 3
                ? "high"
                : "low",

        carbonationLevel:
            gameState.glass.pressure >= 3
                ? "high"
                : gameState.glass.pressure <= 0
                    ? "none"
                    : "low",

        carbonationGets:
            carbonationGets,

        stillFinish:
            !hasFizz,

        hasFizz:
            hasFizz,

        hasColaBase:
            hasColaBase,

        drinkType:
            drinkType,

        singleIngredientId:
            singleIngredientId,

        chillLevel:
            coolingCount >= 2
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

function getResultScrapTitle(
    result,
    language
) {
    let category =
        "neutral";

    if (
        result.strange > 0
    ) {
        category =
            "mystery";
    } else if (
        result.sweetness >= 3
    ) {
        category =
            "sweet";
    } else if (
        result.spice >= 2
    ) {
        category =
            "spice";
    } else if (
        result.chill >= 2 ||
        result.garnish === "lemon" ||
        result.ingredientIds.indexOf(
            "lemon_peel"
        ) >= 0 ||
        result.ingredientIds.indexOf(
            "herb"
        ) >= 0
    ) {
        category =
            "fresh";
    }

    const titlePools = {
        ja: {
            sweet: [
                "開発途中ペースト",
                "未確認シロップ片",
                "コーラになる予定だったもの",
                "甘い気配の断片",
            ],
            spice: [
                "香りの下書き",
                "調合途中の断片",
                "途中の気配",
                "何かの痕跡",
            ],
            fresh: [
                "まだ名前のない液体",
                "香りだけ集まった何か",
                "味のメモ",
                "仕込みかけの何か",
            ],
            mystery: [
                "工房メモ No.3",
                "瓶に残った構想",
                "未確認シロップ片",
                "何かの痕跡",
            ],
            neutral: [
                "仕込みかけの何か",
                "まだ名前のない液体",
                "途中の気配",
                "開発途中ペースト",
            ],
        },

        en: {
            sweet: [
                "Prototype Paste",
                "Unknown Syrup Fragment",
                "Future Cola Candidate",
                "Sweet Trace",
            ],
            spice: [
                "Aroma Draft",
                "Half-Mixed Fragment",
                "Something in Progress",
                "Trace of Something",
            ],
            fresh: [
                "Unnamed Liquid",
                "Collected Aroma",
                "Flavor Memo",
                "Half-Made Something",
            ],
            mystery: [
                "Workshop Memo No.3",
                "Bottled Idea",
                "Unknown Syrup Fragment",
                "Trace of Something",
            ],
            neutral: [
                "Half-Made Something",
                "Unnamed Liquid",
                "Something in Progress",
                "Prototype Paste",
            ],
        },
    };

    const pool =
        titlePools[
            language
        ][category];

    let signature = 0;

    for (
        const ingredientId of
        result.ingredientIds
    ) {
        const count =
            result.ingredientCounts[
                ingredientId
            ] || 1;

        for (
            let index = 0;
            index <
                ingredientId.length;
            index += 1
        ) {
            signature +=
                ingredientId.charCodeAt(
                    index
                ) *
                count;
        }
    }

    signature +=
        (result.pressure || 0) * 7 +
        (result.chill || 0) * 11 +
        (result.spilledCount || 0) * 13 +
        (result.burstCount || 0) * 17 +
        (result.stirCount || 0) * 19 +
        (result.mysteryCount || 0) * 23 +
        (result.glassFullCount || 0) * 29;

    return pool[
        signature %
            pool.length
    ];
}

function getResultMainFlavorDescription(
    result,
    language
) {
    const ingredientId =
        result.topIngredientId ||
        result.singleIngredientId ||
        null;

    if (language === "ja") {
        if (
            ingredientId ===
            "base_syrup"
        ) {
            return "素朴な甘みが、まっすぐ瓶の中に残っています。";
        }

        if (
            ingredientId ===
            "thick_syrup"
        ) {
            return "濃いシロップの重なりで、どっしりした仕上がりです。";
        }

        if (
            ingredientId ===
            "vanilla"
        ) {
            return "バニラの甘い香りで、やわらかくまとまりました。";
        }

        if (
            ingredientId ===
            "caramel"
        ) {
            return "キャラメルの香ばしさが、少し丸い余韻を残します。";
        }

        if (
            ingredientId ===
            "ginger"
        ) {
            return "生姜の香りがまっすぐ立った、少し刺激的な仕上がりです。";
        }

        if (
            ingredientId ===
            "cinnamon"
        ) {
            return "シナモンの香りが、静かに奥行きを足しています。";
        }

        if (
            ingredientId ===
            "lemon_peel"
        ) {
            return "レモンの香りが軽く抜ける、さっぱりした仕上がりです。";
        }

        if (
            ingredientId ===
            "herb"
        ) {
            return "薬草の青い香りが、少しだけ不思議な後味を残します。";
        }

        if (
            ingredientId ===
            "brown_sugar"
        ) {
            return "黒糖の深い甘みが、瓶の底にゆっくり残る一本です。";
        }

        if (
            ingredientId ===
            "secret_syrup"
        ) {
            return "秘伝の香りが、最後まで正体を隠しています。";
        }

        return "集めた素材が瓶の中で、ひとつの味にまとまりました。";
    }

    if (
        ingredientId ===
        "base_syrup"
    ) {
        return "A simple sweetness settles neatly inside the bottle.";
    }

    if (
        ingredientId ===
        "thick_syrup"
    ) {
        return "The thick syrup gives it a deep and weighty finish.";
    }

    if (
        ingredientId ===
        "vanilla"
    ) {
        return "Vanilla softens the whole drink with a gentle aroma.";
    }

    if (
        ingredientId ===
        "caramel"
    ) {
        return "Caramel leaves a warm, rounded sweetness behind.";
    }

    if (
        ingredientId ===
        "ginger"
    ) {
        return "Ginger stands straight at the front with a small sharp kick.";
    }

    if (
        ingredientId ===
        "cinnamon"
    ) {
        return "Cinnamon quietly adds a little depth to the finish.";
    }

    if (
        ingredientId ===
        "lemon_peel"
    ) {
        return "Lemon peel gives it a light and refreshing edge.";
    }

    if (
        ingredientId ===
        "herb"
    ) {
        return "A green herbal note leaves a slightly mysterious finish.";
    }

    if (
        ingredientId ===
        "brown_sugar"
    ) {
        return "Brown sugar leaves a slow, deep sweetness at the bottom of the bottle.";
    }

    if (
        ingredientId ===
        "secret_syrup"
    ) {
        return "The secret syrup keeps its true flavor hidden to the end.";
    }

    return "Everything collected has settled into one small finished flavor.";
}


function startResultScreen() {
    gameState.phase =
        "RESULT";

    gameState.resultReveal.scale =
        0.985;

    gameState.resultReveal.alpha =
        0;

    gameState.resultCrownReveal = {
        alpha: 0,
        rotation: -96,
        scale: 0.26,
        yOffset: 10,
        sparkAlpha: 0,
        sparkScale: 0.72,
        sparkRotation: -14,
    };

    const fizzTransition = {
        active: true,
        startedAt: ElapsedTime,
        darkAlpha: 0,
        bubbleAlpha: 0,
        bubbles:
            createTitleTransitionBubbles(),
    };

    gameState.resultFizzTransition =
        fizzTransition;

    tween(
        0.22,
        fizzTransition,
        {
            darkAlpha: 255,
            bubbleAlpha: 245,
        },
        tween.easing.quadOut,
        function() {
            const holdTimer = {
                value: 0,
            };

            tween(
                0.28,
                holdTimer,
                {
                    value: 1,
                },
                tween.easing.linear,
                function() {
                    tween(
                        0.30,
                        gameState.resultReveal,
                        {
                            scale: 1,
                            alpha: 255,
                        },
                        tween.easing.quadOut,
                        function() {
                            const crownDelay = {
                                value: 0,
                            };

                            tween(
                                0.08,
                                crownDelay,
                                {
                                    value: 1,
                                },
                                tween.easing.linear,
                                function() {
                                    tween(
                                        0.24,
                                        gameState.resultCrownReveal,
                                        {
                                            alpha: 255,
                                            rotation: 16,
                                            scale: 1.12,
                                            yOffset: -2,
                                        },
                                        tween.easing.quadOut,
                                        function() {
                                            tween(
                                                0.18,
                                                gameState.resultCrownReveal,
                                                {
                                                    rotation: 0,
                                                    scale: 1,
                                                    yOffset: 0,
                                                },
                                                tween.easing.bounceOut,
                                                function() {
                                                    gameState.resultCrownReveal.sparkAlpha =
                                                        220;

                                                    gameState.resultCrownReveal.sparkScale =
                                                        0.76;

                                                    gameState.resultCrownReveal.sparkRotation =
                                                        -10;

                                                    tween(
                                                        0.34,
                                                        gameState.resultCrownReveal,
                                                        {
                                                            sparkAlpha: 0,
                                                            sparkScale: 1.16,
                                                            sparkRotation: 18,
                                                        },
                                                        tween.easing.quadOut
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );

                    tween(
                        0.34,
                        fizzTransition,
                        {
                            darkAlpha: 0,
                            bubbleAlpha: 0,
                        },
                        tween.easing.quadIn,
                        function() {
                            fizzTransition.active =
                                false;
                        }
                    );
                }
            );
        }
    );
}




function drawResultFizzTransition() {
    const transition =
        gameState.resultFizzTransition;

    if (
        !transition ||
        !transition.active
    ) {
        return;
    }

    const darkAlpha =
        Math.max(
            0,
            Math.min(
                255,
                transition.darkAlpha
            )
        );

    const bubbleAlpha =
        Math.max(
            0,
            Math.min(
                255,
                transition.bubbleAlpha
            )
        );

    const elapsed =
        Math.max(
            0,
            ElapsedTime -
                transition.startedAt
        );

    if (
        darkAlpha > 0
    ) {
        rectMode(CORNER);
        noStroke();

        fill(
            15,
            10,
            9,
            darkAlpha
        );

        rect(
            0,
            0,
            WIDTH,
            HEIGHT
        );
    }

    if (
        bubbleAlpha <= 0
    ) {
        rectMode(CORNER);
        noStroke();
        return;
    }

    const bubbles =
        transition.bubbles || [];

    for (
        let index = 0;
        index < bubbles.length;
        index += 1
    ) {
        const bubble =
            bubbles[index];

        const progress =
            (
                elapsed -
                bubble.delay
            ) /
            bubble.life;

        if (
            progress <= 0 ||
            progress >= 1
        ) {
            continue;
        }

        const bubbleX =
            bubble.x +
            Math.sin(
                progress *
                    bubble.wobbleSpeed +
                bubble.phase
            ) *
                bubble.wobble;

        const bubbleY =
            bubble.startY +
            bubble.travel *
                progress;

        const size =
            bubble.size *
            (
                0.76 +
                progress * 0.42
            );

        const localAlpha =
            bubbleAlpha *
            Math.sin(
                progress *
                Math.PI
            );

        noFill();

        stroke(
            221,
            246,
            250,
            localAlpha * 0.88
        );

        strokeWidth(
            Math.max(
                0.8,
                size * 0.14
            )
        );

        ellipse(
            bubbleX,
            bubbleY,
            size
        );

        stroke(
            255,
            239,
            198,
            localAlpha * 0.38
        );

        strokeWidth(
            Math.max(
                0.6,
                size * 0.075
            )
        );

        ellipse(
            bubbleX -
                size * 0.16,
            bubbleY +
                size * 0.12,
            size * 0.42
        );

        noStroke();

        fill(
            255,
            247,
            224,
            localAlpha * 0.34
        );

        ellipse(
            bubbleX -
                size * 0.18,
            bubbleY +
                size * 0.20,
            Math.max(
                1.2,
                size * 0.18
            )
        );
    }

    rectMode(CORNER);
    noStroke();
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

    const drinkType =
        result.drinkType ||
        "cola";

    if (
        drinkType ===
        "single" ||
        drinkType ===
        "single_soda"
    ) {
        const ingredient =
            INGREDIENTS[
                result.singleIngredientId
            ];

        if (
            drinkType ===
            "single_soda"
        ) {
            if (language === "ja") {
                if (
                    result.singleIngredientId ===
                    "lemon_peel"
                ) {
                    return "レモンソーダ";
                }

                if (ingredient) {
                    return (
                        ingredient.ja +
                        "ソーダ"
                    );
                }

                return "何かのソーダ";
            }

            if (
                result.singleIngredientId ===
                "lemon_peel"
            ) {
                return "Lemon Soda";
            }

            if (ingredient) {
                return (
                    ingredient.en +
                    " Soda"
                );
            }

            return "Something Soda";
        }

        if (ingredient) {
            return ingredient[
                language
            ];
        }

        return language === "ja"
            ? "何か"
            : "Something";
    }

    if (
        drinkType ===
        "plain_soda"
    ) {
        if (language === "ja") {
            if (
                result.pressure >= 3
            ) {
                return "勢いのある炭酸水";
            }

            if (
                result.chill >= 2
            ) {
                return "ひんやり炭酸水";
            }

            return "ただの炭酸水";
        }

        if (
            result.pressure >= 3
        ) {
            return "Brisk Sparkling Water";
        }

        if (
            result.chill >= 2
        ) {
            return "Chilled Sparkling Water";
        }

        return "Plain Sparkling Water";
    }

    if (
        drinkType ===
        "nothing"
    ) {
        return language === "ja"
            ? "仕込み前の瓶"
            : "Bottle Before Brewing";
    }

    if (
        drinkType ===
        "scrap"
    ) {
        if (
            typeof getResultScrapTitle ===
            "function"
        ) {
            return getResultScrapTitle(
                result,
                language
            );
        }

        return language === "ja"
            ? "仕込みかけの何か"
            : "Half-Made Something";
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

        if (
            drinkType ===
            "syrup"
        ) {
            let syrupName =
                "泡待ちシロップ";

            if (
                result.sweetness >= 4
            ) {
                syrupName =
                    "濃厚コーラの素";
            } else if (
                result.strange > 0
            ) {
                syrupName =
                    "静かな秘伝シロップ";
            } else if (
                result.chill >= 2
            ) {
                syrupName =
                    "ひんやりコーラの素";
            }

            return (
                prefix +
                garnishText +
                syrupName
            );
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

    if (
        drinkType ===
        "syrup"
    ) {
        let syrupName =
            " Waiting-for-Fizz Syrup";

        if (
            result.sweetness >= 4
        ) {
            syrupName =
                " Rich Cola Base";
        } else if (
            result.strange > 0
        ) {
            syrupName =
                " Quiet Secret Syrup";
        } else if (
            result.chill >= 2
        ) {
            syrupName =
                " Chilled Cola Base";
        }

        return (
            prefix +
            garnishText +
            syrupName
        );
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

const generateResultNameBaseForStillGarnish =
    generateResultName;

generateResultName = function() {
    const result =
        gameState.resultData || {};

    const name =
        generateResultNameBaseForStillGarnish();

    if (
        gameState.language === "ja" &&
        result.garnish === "cherry" &&
        getResultGlassDrinkKind() ===
            "none"
    ) {
        return name.replace(
            "チェリー浮かぶ",
            "チェリー添えの"
        );
    }

    return name;
};



function generateResultDescription() {
    const result =
        gameState.resultData;

    const language =
        gameState.language;

    if (!result) {
        return "";
    }

    const drinkType =
        result.drinkType ||
        "cola";

    const safeFlavorDescription = function() {
        if (
            typeof getResultMainFlavorDescription ===
            "function"
        ) {
            return getResultMainFlavorDescription(
                result,
                language
            );
        }

        return language === "ja"
            ? "集めた素材が瓶の中で、ひとつの味にまとまりました。"
            : "Everything collected has settled into one small finished flavor.";
    };

    if (language === "ja") {
        if (
            drinkType ===
            "single"
        ) {
            const ingredient =
                INGREDIENTS[
                    result.singleIngredientId
                ];

            const name =
                ingredient
                    ? ingredient.ja
                    : "何か";

            return (
                "今日は" +
                name +
                "が主役です。飲みものというより、かなり堂々とした素材そのもの。"
            );
        }

        if (
            drinkType ===
            "single_soda"
        ) {
            const ingredient =
                INGREDIENTS[
                    result.singleIngredientId
                ];

            const name =
                ingredient
                    ? ingredient.ja
                    : "何か";

            if (
                result.singleIngredientId ===
                "lemon_peel"
            ) {
                return "レモンの香りと炭酸だけで、思ったよりちゃんと爽やかです。";
            }

            if (
                result.singleIngredientId ===
                "ginger"
            ) {
                return "生姜と炭酸だけで押し切った、妙にまっすぐな一杯です。";
            }

            if (
                result.singleIngredientId ===
                "herb"
            ) {
                return "薬草と炭酸だけで仕上がった、少し不思議なソーダです。";
            }

            return (
                name +
                "だけを頼りに仕上がった、まっすぐなソーダです。"
            );
        }

        if (
            drinkType ===
            "plain_soda"
        ) {
            if (
                result.chill >= 2
            ) {
                return "素材は少ないのに、炭酸だけはしっかり冷えています。";
            }

            return "素材は集まりませんでしたが、炭酸だけは元気に残りました。";
        }

        if (
            drinkType ===
            "nothing"
        ) {
            return "素材は集まりませんでしたが、瓶だけは無事にゴールしました。";
        }

        if (
            drinkType ===
            "scrap"
        ) {
            if (
                result.hasFizz
            ) {
                if (
                    result.spice >= 2
                ) {
                    return "香りは立っていますが、名前をつけるにはまだ少し早い炭酸の何かです。";
                }

                if (
                    result.sweetness >= 3
                ) {
                    return "甘みと炭酸はあります。あとは名乗る勇気だけです。";
                }

                return "いくつか混ざった結果、名前のつかない炭酸の何かができました。";
            }

            if (
                result.spice >= 2
            ) {
                return "香りはいくつか集まりましたが、まだ飲みものになる前の気配です。";
            }

            if (
                result.sweetness >= 3
            ) {
                return "甘い方向には進んでいます。完成までは、もう少し相談が必要そうです。";
            }

            return "いくつか混ざりましたが、まだ何になるかは誰にも分かりません。";
        }

        if (
            drinkType ===
            "syrup"
        ) {
            if (
                result.topIngredientId ===
                "secret_syrup" ||
                (
                    result.strangeIngredientIds &&
                    result.strangeIngredientIds.indexOf(
                        "secret_syrup"
                    ) >= 0
                )
            ) {
                return "泡はありませんが、香りはなかなか本気です。炭酸を足せばきっと完成。";
            }

            if (
                result.topIngredientId ===
                "brown_sugar"
            ) {
                return "黒糖の深い甘みが残る、コーラになる前の濃い仕込みです。";
            }

            if (
                result.chill >= 2
            ) {
                return "しっかり冷えているのに、泡だけがまだ来ていません。これはこれで濃い一杯です。";
            }

            if (
                result.sweetness >= 4
            ) {
                return "泡はないけれど、甘みは十分。コーラになる前のごちそうです。";
            }

            return "炭酸は入りませんでしたが、香りはしっかり仕上がりました。";
        }

        if (
            result.burstCount >= 2
        ) {
            return "何度も炭酸の限界を越えた、かなり危険な一本。";
        }

        if (
            result.burstCount === 1
        ) {
            return "一度はじけても、まだ炭酸は元気です。";
        }

        if (
            result.stirCount >= 3
        ) {
            return "何度も混ぜられ、味の重なりがすっかり変わりました。";
        }

        if (
            result.spilledCount > 0
        ) {
            return (
                safeFlavorDescription() +
                " 少しこぼれましたが、それも含めて今回の仕上がりです。"
            );
        }

        if (
            result.chill >= 2
        ) {
            return (
                safeFlavorDescription() +
                " しっかり冷えて、飲み頃になっています。"
            );
        }

        if (
            result.chill === 1
        ) {
            return (
                safeFlavorDescription() +
                " ひんやり仕上がった一本です。"
            );
        }

        return safeFlavorDescription();
    }

    if (
        drinkType ===
        "single"
    ) {
        const ingredient =
            INGREDIENTS[
                result.singleIngredientId
            ];

        const name =
            ingredient
                ? ingredient.en
                : "Something";

        return (
            "Today, " +
            name +
            " takes center stage. Less a drink, more a very confident ingredient."
        );
    }

    if (
        drinkType ===
        "single_soda"
    ) {
        const ingredient =
            INGREDIENTS[
                result.singleIngredientId
            ];

        const name =
            ingredient
                ? ingredient.en
                : "Something";

        if (
            result.singleIngredientId ===
            "lemon_peel"
        ) {
            return "Lemon and bubbles only. Somehow, that is enough.";
        }

        if (
            result.singleIngredientId ===
            "ginger"
        ) {
            return "Ginger and bubbles push this drink forward with surprising confidence.";
        }

        if (
            result.singleIngredientId ===
            "herb"
        ) {
            return "Herbs and bubbles make a slightly mysterious soda.";
        }

        return (
            "A very direct soda made almost entirely out of " +
            name +
            "."
        );
    }

    if (
        drinkType ===
        "plain_soda"
    ) {
        if (
            result.chill >= 2
        ) {
            return "Not much else made it in, but the sparkling water is nicely chilled.";
        }

        return "Few ingredients showed up, but the bubbles still did their job.";
    }

    if (
        drinkType ===
        "nothing"
    ) {
        return "No real ingredients were collected, but the bottle still made it to the finish.";
    }

    if (
        drinkType ===
        "scrap"
    ) {
        if (
            result.hasFizz
        ) {
            if (
                result.spice >= 2
            ) {
                return "The aroma is there, but it is still too early to give this fizzy thing a proper name.";
            }

            if (
                result.sweetness >= 3
            ) {
                return "It has sweetness and bubbles. Now it only needs the courage to introduce itself.";
            }

            return "Several things were mixed together, and somehow it turned into an unnamed fizzy something.";
        }

        if (
            result.spice >= 2
        ) {
            return "Several aromas gathered here, but it still feels like a drink before becoming a drink.";
        }

        if (
            result.sweetness >= 3
        ) {
            return "It is moving in a sweet direction, but the recipe still needs another conversation.";
        }

        return "Several things were mixed together, and nobody is quite sure what it wants to become.";
    }

    if (
        drinkType ===
        "syrup"
    ) {
        if (
            result.topIngredientId ===
            "secret_syrup" ||
            (
                result.strangeIngredientIds &&
                result.strangeIngredientIds.indexOf(
                    "secret_syrup"
                ) >= 0
            )
        ) {
            return "No bubbles yet, but the aroma is oddly serious. Add fizz and it might be complete.";
        }

        if (
            result.topIngredientId ===
            "brown_sugar"
        ) {
            return "Brown sugar leaves a deep sweetness in this cola base before it becomes cola.";
        }

        if (
            result.chill >= 2
        ) {
            return "Well chilled, strangely quiet, and still waiting for its bubbles.";
        }

        if (
            result.sweetness >= 4
        ) {
            return "No fizz, plenty of sweetness. A tasty thing just before it becomes cola.";
        }

        return "No sparkling water made it in, but the flavor still found a way.";
    }

    if (
        result.burstCount >= 2
    ) {
        return "A dangerously fizzy bottle that crossed the limit more than once.";
    }

    if (
        result.burstCount === 1
    ) {
        return "It burst once, but the fizz is still going strong.";
    }

    if (
        result.stirCount >= 3
    ) {
        return "Stirred again and again until every flavor changed places.";
    }

    if (
        result.spilledCount > 0
    ) {
        return (
            safeFlavorDescription() +
            " A little spilled, but that is part of this bottle too."
        );
    }

    if (
        result.chill >= 2
    ) {
        return (
            safeFlavorDescription() +
            " Thoroughly chilled and ready to drink."
        );
    }

    if (
        result.chill === 1
    ) {
        return (
            safeFlavorDescription() +
            " Gently chilled for the finish."
        );
    }

    return safeFlavorDescription();
}

function appendResultSpillMemory(
    description
) {
    const result =
        gameState.resultData;

    const spilledCount =
        result && result.spilledCount
            ? result.spilledCount
            : 0;

    if (
        spilledCount <= 0
    ) {
        return description;
    }

    const language =
        gameState.language;

    let baseDescription =
        String(
            description || ""
        );

    if (language === "ja") {
        baseDescription =
            baseDescription.replace(
                " 少しこぼれましたが、それも含めて今回の仕上がりです。",
                ""
            ).replace(
                "少しこぼれましたが、それも含めて今回の仕上がりです。",
                ""
            ).trim();

        const memory =
            spilledCount >= 3
                ? "少し慌ただしい仕込みでしたが、残った香りはしっかりまとまりました。"
                : "少しこぼれましたが、それも含めて今回の仕上がりです。";

        return (
            baseDescription +
            (
                baseDescription
                    ? " "
                    : ""
            ) +
            memory
        );
    }

    baseDescription =
        baseDescription.replace(
            " A little spilled, but that is part of this bottle too.",
            ""
        ).replace(
            "A little spilled, but that is part of this bottle too.",
            ""
        ).trim();

    const memory =
        spilledCount >= 3
            ? "It was a lively brew, but the flavors that stayed found their place."
            : "A little spilled, but that is part of this bottle too.";

    return (
        baseDescription +
        (
            baseDescription
                ? " "
                : ""
        ) +
        memory
    );
}

const generateResultDescriptionBase =
    generateResultDescription;

generateResultDescription = function() {
    return appendResultSpillMemory(
        generateResultDescriptionBase()
    );
};



function getResultBottleLabelDesign() {
    const result =
        gameState.resultData || {};

    let mainId =
        result.topIngredientId ||
        null;

    if (
        !mainId &&
        result.ingredientCountList &&
        result.ingredientCountList.length > 0
    ) {
        let bestCount = -1;

        for (
            const item of
            result.ingredientCountList
        ) {
            if (
                item.count >
                bestCount
            ) {
                bestCount =
                    item.count;

                mainId =
                    item.id;
            }
        }
    }

    if (
        !mainId &&
        result.ingredientIds &&
        result.ingredientIds.length > 0
    ) {
        mainId =
            result.ingredientIds[
                result.ingredientIds.length - 1
            ];
    }

    const designs = {
        base_syrup: {
            base: {
                r: 178,
                g: 102,
                b: 42,
            },
            light: {
                r: 238,
                g: 181,
                b: 94,
            },
            dark: {
                r: 84,
                g: 43,
                b: 24,
            },
            symbol:
                "drop",
            pattern:
                "round",
        },

        thick_syrup: {
            base: {
                r: 112,
                g: 58,
                b: 28,
            },
            light: {
                r: 216,
                g: 145,
                b: 70,
            },
            dark: {
                r: 55,
                g: 28,
                b: 17,
            },
            symbol:
                "square",
            pattern:
                "heavy",
        },

        vanilla: {
            base: {
                r: 218,
                g: 189,
                b: 127,
            },
            light: {
                r: 255,
                g: 240,
                b: 178,
            },
            dark: {
                r: 113,
                g: 80,
                b: 42,
            },
            symbol:
                "flower",
            pattern:
                "round",
        },

        caramel: {
            base: {
                r: 174,
                g: 96,
                b: 36,
            },
            light: {
                r: 246,
                g: 172,
                b: 72,
            },
            dark: {
                r: 90,
                g: 43,
                b: 18,
            },
            symbol:
                "ring",
            pattern:
                "drop",
        },

        ginger: {
            base: {
                r: 194,
                g: 151,
                b: 67,
            },
            light: {
                r: 244,
                g: 211,
                b: 119,
            },
            dark: {
                r: 100,
                g: 72,
                b: 32,
            },
            symbol:
                "slash",
            pattern:
                "spice",
        },

        cinnamon: {
            base: {
                r: 152,
                g: 72,
                b: 44,
            },
            light: {
                r: 226,
                g: 133,
                b: 81,
            },
            dark: {
                r: 78,
                g: 34,
                b: 25,
            },
            symbol:
                "sticks",
            pattern:
                "spice",
        },

        lemon_peel: {
            base: {
                r: 196,
                g: 170,
                b: 55,
            },
            light: {
                r: 245,
                g: 226,
                b: 92,
            },
            dark: {
                r: 95,
                g: 91,
                b: 30,
            },
            symbol:
                "moon",
            pattern:
                "fresh",
        },

        herb: {
            base: {
                r: 76,
                g: 120,
                b: 63,
            },
            light: {
                r: 165,
                g: 204,
                b: 111,
            },
            dark: {
                r: 33,
                g: 65,
                b: 37,
            },
            symbol:
                "leaf",
            pattern:
                "fresh",
        },

        brown_sugar: {
            base: {
                r: 88,
                g: 56,
                b: 32,
            },
            light: {
                r: 185,
                g: 126,
                b: 70,
            },
            dark: {
                r: 43,
                g: 29,
                b: 19,
            },
            symbol:
                "cube",
            pattern:
                "heavy",
        },

        secret_syrup: {
            base: {
                r: 104,
                g: 62,
                b: 126,
            },
            light: {
                r: 210,
                g: 157,
                b: 224,
            },
            dark: {
                r: 48,
                g: 29,
                b: 63,
            },
            symbol:
                "diamond",
            pattern:
                "mystery",
        },
    };

    let design =
        designs[
            mainId
        ] ||
        designs.base_syrup;

    const carbonationGets =
        result.carbonationGets ===
            undefined
            ? (
                result.pressure > 0
                    ? result.pressure
                    : 0
            )
            : result.carbonationGets;

    const pressure =
        result.pressure || 0;

    const coolingCount =
        result.coolingCount ||
        result.iceCount ||
        0;

    const hasSecret =
        result.strangeIngredientIds &&
        result.strangeIngredientIds.indexOf(
            "secret_syrup"
        ) >= 0;

    return {
        mainId:
            mainId,

        base:
            design.base,

        light:
            design.light,

        dark:
            design.dark,

        symbol:
            design.symbol,

        pattern:
            design.pattern,

        carbonationGets:
            carbonationGets,

        pressure:
            pressure,

        stillFinish:
            carbonationGets <= 0,

        coolingCount:
            coolingCount,

        garnish:
            result.garnish,

        hasSecret:
            hasSecret,

        burstCount:
            result.burstCount || 0,

        perfectStopCount:
            gameState.perfectStopCount || 0,

        perfectGoal:
            gameState.perfectGoalStop === true,
    };
}

function drawResultLabelMainMark(
    design,
    alpha
) {
    const light =
        design.light;

    const dark =
        design.dark;

    const base =
        design.base;

    pushMatrix();

    rectMode(CENTER);
    ellipseMode(CENTER);

    if (
        design.symbol ===
        "flower"
    ) {
        fill(
            light.r,
            light.g,
            light.b,
            alpha * 0.88
        );

        ellipse(
            -5,
            0,
            10
        );

        ellipse(
            5,
            0,
            10
        );

        ellipse(
            0,
            -5,
            10
        );

        ellipse(
            0,
            5,
            10
        );

        fill(
            dark.r,
            dark.g,
            dark.b,
            alpha * 0.72
        );

        ellipse(
            0,
            0,
            7
        );
    } else if (
        design.symbol ===
        "ring"
    ) {
        noFill();

        stroke(
            light.r,
            light.g,
            light.b,
            alpha * 0.88
        );

        strokeWidth(3);

        ellipse(
            0,
            0,
            22
        );

        stroke(
            dark.r,
            dark.g,
            dark.b,
            alpha * 0.62
        );

        strokeWidth(1.4);

        ellipse(
            0,
            0,
            12
        );

        noStroke();
    } else if (
        design.symbol ===
        "slash"
    ) {
        stroke(
            light.r,
            light.g,
            light.b,
            alpha * 0.92
        );

        strokeWidth(4);

        line(
            -11,
            -9,
            11,
            9
        );

        stroke(
            dark.r,
            dark.g,
            dark.b,
            alpha * 0.58
        );

        strokeWidth(2);

        line(
            -7,
            8,
            9,
            -8
        );

        noStroke();
    } else if (
        design.symbol ===
        "sticks"
    ) {
        rectMode(CENTER);

        pushMatrix();

        rotate(16);

        fill(
            dark.r,
            dark.g,
            dark.b,
            alpha * 0.86
        );

        rect(
            -4,
            0,
            4,
            24,
            2
        );

        rect(
            5,
            0,
            4,
            24,
            2
        );

        fill(
            light.r,
            light.g,
            light.b,
            alpha * 0.46
        );

        rect(
            -4,
            0,
            1.5,
            19,
            1
        );

        rect(
            5,
            0,
            1.5,
            19,
            1
        );

        popMatrix();

        rectMode(CENTER);
    } else if (
        design.symbol ===
        "moon"
    ) {
        fill(
            light.r,
            light.g,
            light.b,
            alpha * 0.88
        );

        ellipse(
            0,
            0,
            24
        );

        fill(
            base.r,
            base.g,
            base.b,
            alpha
        );

        ellipse(
            7,
            4,
            24
        );
    } else if (
        design.symbol ===
        "leaf"
    ) {
        fill(
            light.r,
            light.g,
            light.b,
            alpha * 0.82
        );

        pushMatrix();

        rotate(-28);

        ellipse(
            0,
            0,
            25,
            12
        );

        popMatrix();

        stroke(
            dark.r,
            dark.g,
            dark.b,
            alpha * 0.62
        );

        strokeWidth(1.4);

        line(
            -8,
            -5,
            8,
            5
        );

        noStroke();
    } else if (
        design.symbol ===
        "cube"
    ) {
        rectMode(CENTER);

        fill(
            dark.r,
            dark.g,
            dark.b,
            alpha * 0.90
        );

        rect(
            0,
            0,
            20,
            20,
            3
        );

        fill(
            light.r,
            light.g,
            light.b,
            alpha * 0.35
        );

        rect(
            -4,
            4,
            7,
            7,
            2
        );

        rectMode(CENTER);
    } else if (
        design.symbol ===
        "diamond"
    ) {
        pushMatrix();

        rotate(45);

        rectMode(CENTER);

        fill(
            dark.r,
            dark.g,
            dark.b,
            alpha * 0.88
        );

        rect(
            0,
            0,
            19,
            19,
            3
        );

        fill(
            light.r,
            light.g,
            light.b,
            alpha * 0.52
        );

        rect(
            0,
            0,
            8,
            8,
            2
        );

        popMatrix();

        rectMode(CENTER);
    } else if (
        design.symbol ===
        "square"
    ) {
        rectMode(CENTER);

        fill(
            dark.r,
            dark.g,
            dark.b,
            alpha * 0.88
        );

        rect(
            0,
            0,
            23,
            18,
            4
        );

        fill(
            light.r,
            light.g,
            light.b,
            alpha * 0.34
        );

        rect(
            -4,
            3,
            8,
            5,
            2
        );

        rectMode(CENTER);
    } else {
        fill(
            light.r,
            light.g,
            light.b,
            alpha * 0.86
        );

        ellipse(
            0,
            1,
            18,
            22
        );

        fill(
            dark.r,
            dark.g,
            dark.b,
            alpha * 0.40
        );

        ellipse(
            4,
            -4,
            7
        );
    }

    popMatrix();

    rectMode(CENTER);
    ellipseMode(CENTER);
    noStroke();
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

const ROULETTE_FLOW_CONFIG = {
    rollCount: 10,
    rollStep: 0.06,
    rollStepGrowth: 0.014,
    resultHoldDuration: 0.9,
};


function startMysteryIngredient() {
    gameState.phase =
        "WAIT_MYSTERY_ROLL";

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
        scale: 1,
        alpha: 255,
        ringRotation: 0,
        locked: false,
    };
}

function startMysteryRoulette() {
    const mystery =
        gameState.mystery;

    if (
        gameState.phase !==
            "WAIT_MYSTERY_ROLL" ||
        !mystery
    ) {
        return;
    }

    gameState.phase =
        "MYSTERY_ROLLING";

    mystery.rollIndex = 0;
    mystery.locked = false;
    mystery.scale = 0.82;
    mystery.alpha = 255;

    let step =
        ROULETTE_FLOW_CONFIG.rollStep;

    const rollNext = function() {
        const currentMystery =
            gameState.mystery;

        if (!currentMystery) {
            return;
        }

        currentMystery.rollIndex += 1;

        let nextIngredient =
            weightedRandomIngredient();

        let attempts = 0;

        while (
            nextIngredient ===
                currentMystery.ingredientId &&
            attempts < 4
        ) {
            nextIngredient =
                weightedRandomIngredient();

            attempts += 1;
        }

        currentMystery.ingredientId =
            nextIngredient;

        currentMystery.scale = 0.82;

        tween(
            step,
            currentMystery,
            {
                scale: 1.04,
                ringRotation:
                    currentMystery.ringRotation +
                    48,
            },
            tween.easing.quadOut
        );

        if (
            currentMystery.rollIndex <
            ROULETTE_FLOW_CONFIG.rollCount
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
                ROULETTE_FLOW_CONFIG.rollStepGrowth;

            return;
        }

        currentMystery.locked = true;

        gameState.phase =
            "MYSTERY_RESULT";

        tween(
            0.18,
            currentMystery,
            {
                scale: 1.14,
                ringRotation:
                    currentMystery.ringRotation +
                    72,
            },
            tween.easing.bounceOut
        );

        const resultTimer = {
            value: 0,
        };

        tween(
            ROULETTE_FLOW_CONFIG.resultHoldDuration,
            resultTimer,
            {
                value: 1,
            },
            tween.easing.linear,
            function() {
                const ingredientId =
                    currentMystery.ingredientId;

                currentMystery.visible =
                    false;

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
    if (
        gameState.phase !==
        "WAIT_EVENT_ROLL"
    ) {
        return;
    }

    gameState.phase =
        "EVENT_ROLLING";

    let rollCount = 0;

    let step =
        ROULETTE_FLOW_CONFIG.rollStep;

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
            ROULETTE_FLOW_CONFIG.rollCount
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
                ROULETTE_FLOW_CONFIG.rollStepGrowth;

            return;
        }

        gameState.phase =
            "SHOWING_EVENT_RESULT";

        const resultTimer = {
            value: 0,
        };

        tween(
            ROULETTE_FLOW_CONFIG.resultHoldDuration,
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

    startBottleShakeCycle(
        eventId
    );

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

function startBottleShakeCycle(eventId) {
    let intensity = 0.72;
    let speed = 34;
    let travelX = 5;
    let travelY = 1.5;
    let rotation = 3.5;

    if (eventId === "flip") {
        intensity = 0.92;
        speed = 29;
        travelX = 4;
        travelY = 4;
        rotation = 7;
    } else if (
        eventId === "swap"
    ) {
        intensity = 0.78;
        speed = 38;
        travelX = 7;
        travelY = 1;
        rotation = 3;
    } else if (
        eventId === "spill"
    ) {
        intensity = 1;
        speed = 43;
        travelX = 9;
        travelY = 2;
        rotation = 8;
    }

    gameState.shakeMotion = {
        visible: true,
        eventId: eventId,
        intensity: 0,
        targetIntensity:
            intensity,
        speed: speed,
        travelX: travelX,
        travelY: travelY,
        rotationAmount:
            rotation,
        alpha: 0,
        clamp: 0,
        pulse: 0,
    };

    tween(
        0.16,
        gameState.shakeMotion,
        {
            intensity:
                intensity,
            alpha: 255,
            clamp: 1,
            pulse: 1,
        },
        tween.easing.bounceOut,
        function() {
            tween(
                0.22,
                gameState.shakeMotion,
                {
                    pulse: 0.25,
                },
                tween.easing.quadOut
            );
        }
    );
}

function getBottleShakeOffset() {
    const motion =
        gameState.shakeMotion;

    if (
        !motion ||
        !motion.visible
    ) {
        return {
            x: 0,
            y: 0,
            rotation: 0,
            intensity: 0,
        };
    }

    const intensity =
        motion.intensity || 0;

    const speed =
        motion.speed || 34;

    const wave1 =
        Math.sin(
            ElapsedTime *
            speed
        );

    const wave2 =
        Math.sin(
            ElapsedTime *
            speed *
            0.63 +
            1.7
        );

    let x =
        wave1 *
        motion.travelX *
        intensity;

    let y =
        wave2 *
        motion.travelY *
        intensity;

    let rotation =
        wave1 *
        motion.rotationAmount *
        intensity;

    if (
        motion.eventId ===
        "flip"
    ) {
        x *= 0.62;

        y +=
            Math.sin(
                ElapsedTime *
                speed *
                0.48
            ) *
            3.5 *
            intensity;

        rotation +=
            wave2 *
            4 *
            intensity;
    } else if (
        motion.eventId ===
        "spill"
    ) {
        const kick =
            Math.max(
                0,
                Math.sin(
                    ElapsedTime *
                    speed *
                    0.37
                )
            );

        x +=
            kick *
            5 *
            intensity;

        rotation +=
            kick *
            4 *
            intensity;
    }

    return {
        x: x,
        y: y,
        rotation: rotation,
        intensity:
            intensity,
    };
}

function drawBottleShakeRig() {
    const motion =
        gameState.shakeMotion;

    if (
        !motion ||
        !motion.visible ||
        motion.alpha <= 0
    ) {
        return;
    }

    const nodePosition =
        getBoardNodeScreenPosition(
            gameState.currentNodeId
        );

    const boardBottleX =
        nodePosition.x;

    const boardBottleY =
        nodePosition.y +
        CONFIG.boardBottleRailOffset -
        (
            CONFIG.boardBottleScreenLift ||
            0
        );

    const inspection =
        getBottleInspectionGeometry();

    const shake =
        getBottleShakeOffset();

    drawBoardBottleShakeClamp(
        boardBottleX,
        boardBottleY,
        motion,
        shake
    );

    drawInspectionBottleShakeClamp(
        inspection,
        motion,
        shake
    );
}

function drawBoardBottleShakeClamp(
    x,
    y,
    motion,
    shake
) {
    const alpha =
        motion.alpha;

    const clamp =
        motion.clamp;

    const intensity =
        shake.intensity;

    const bodyHalfW =
        CONFIG.boardBottleWidth *
        0.5 +
        8;

    const clampX =
        bodyHalfW +
        (
            1 -
            clamp
        ) *
        13;

    const clampY =
        y + 4;

    rectMode(CENTER);
    ellipseMode(CENTER);

    noStroke();

    fill(
        7,
        5,
        4,
        alpha * 0.38
    );

    rect(
        x,
        y - 1,
        62,
        8,
        4
    );

    fill(
        55,
        37,
        27,
        alpha * 0.94
    );

    rect(
        x,
        y - 1,
        58,
        6,
        3
    );

    fill(
        157,
        101,
        55,
        alpha * 0.94
    );

    rect(
        x - clampX,
        clampY,
        9,
        22,
        3
    );

    rect(
        x + clampX,
        clampY,
        9,
        22,
        3
    );

    fill(
        226,
        174,
        104,
        alpha * 0.72
    );

    rect(
        x - clampX + 2,
        clampY,
        2,
        16,
        1
    );

    rect(
        x + clampX - 2,
        clampY,
        2,
        16,
        1
    );

    noFill();

    stroke(
        236,
        194,
        126,
        alpha * 0.68
    );

    strokeWidth(1.4);

    rect(
        x - clampX,
        clampY,
        9,
        22,
        3
    );

    rect(
        x + clampX,
        clampY,
        9,
        22,
        3
    );

    noStroke();

    const lineAlpha =
        alpha *
        intensity *
        0.72;

    if (lineAlpha > 1) {
        stroke(
            245,
            205,
            137,
            lineAlpha
        );

        strokeWidth(1.6);

        const motionDistance =
            12 +
            intensity * 7;

        for (
            let index = 0;
            index < 3;
            index += 1
        ) {
            const offsetY =
                -13 +
                index * 13;

            line(
                x -
                clampX -
                7,
                clampY +
                offsetY,
                x -
                clampX -
                motionDistance,
                clampY +
                offsetY
            );

            line(
                x +
                clampX +
                7,
                clampY +
                offsetY,
                x +
                clampX +
                motionDistance,
                clampY +
                offsetY
            );
        }

        noStroke();
    }

    if (
        motion.eventId ===
        "flip"
    ) {
        noFill();

        stroke(
            245,
            207,
            142,
            lineAlpha * 0.85
        );

        strokeWidth(1.8);

        const arcRadius =
            23 +
            intensity * 5;

        const nativeContext =
            typeof CodeaLite !==
                "undefined" &&
            CodeaLite.state
                ? CodeaLite.state.ctx
                : null;

        if (nativeContext) {
            const ctx =
                nativeContext;

            ctx.save();

            ctx.beginPath();

            ctx.arc(
                x,
                y + 3,
                arcRadius,
                Math.PI * 0.10,
                Math.PI * 0.90
            );

            ctx.strokeStyle =
                "rgba(245,207,142," +
                String(
                    Math.max(
                        0,
                        Math.min(
                            1,
                            lineAlpha /
                            255 *
                            0.85
                        )
                    )
                ) +
                ")";

            ctx.lineWidth = 1.8;

            ctx.stroke();

            ctx.restore();
        }

        noStroke();
    }

    rectMode(CORNER);
}

function drawInspectionBottleShakeClamp(
    geometry,
    motion,
    shake
) {
    const alpha =
        motion.alpha;

    const intensity =
        shake.intensity;

    const centerX =
        geometry.centerX;

    const bodyCenterY =
        geometry.centerY +
        (
            geometry.bodyBottom +
            geometry.bodyTop
        ) *
        geometry.scale *
        0.5;

    const bodyHalfW =
        geometry.bodyWidth *
        geometry.scale *
        0.5;

    const bodyHalfH =
        geometry.bodyHeight *
        geometry.scale *
        0.5;

    const clampX =
        bodyHalfW + 7;

    const clampW = 9;

    const clampH =
        Math.min(
            44,
            bodyHalfH * 0.58
        );

    rectMode(CENTER);

    noStroke();

    fill(
        8,
        5,
        4,
        alpha * 0.32
    );

    rect(
        centerX,
        bodyCenterY,
        bodyHalfW * 2 +
        48,
        9,
        4
    );

    fill(
        54,
        36,
        27,
        alpha * 0.90
    );

    rect(
        centerX,
        bodyCenterY,
        bodyHalfW * 2 +
        43,
        6,
        3
    );

    fill(
        147,
        94,
        52,
        alpha * 0.92
    );

    rect(
        centerX - clampX,
        bodyCenterY,
        clampW,
        clampH,
        3
    );

    rect(
        centerX + clampX,
        bodyCenterY,
        clampW,
        clampH,
        3
    );

    fill(
        229,
        178,
        107,
        alpha * 0.62
    );

    rect(
        centerX -
        clampX +
        2,
        bodyCenterY,
        2,
        clampH - 9,
        1
    );

    rect(
        centerX +
        clampX -
        2,
        bodyCenterY,
        2,
        clampH - 9,
        1
    );

    noFill();

    stroke(
        232,
        188,
        117,
        alpha * 0.62
    );

    strokeWidth(1.4);

    rect(
        centerX - clampX,
        bodyCenterY,
        clampW,
        clampH,
        3
    );

    rect(
        centerX + clampX,
        bodyCenterY,
        clampW,
        clampH,
        3
    );

    noStroke();

    const lineAlpha =
        alpha *
        intensity *
        0.64;

    if (lineAlpha > 1) {
        stroke(
            244,
            205,
            139,
            lineAlpha
        );

        strokeWidth(1.5);

        for (
            let index = 0;
            index < 4;
            index += 1
        ) {
            const lineY =
                bodyCenterY -
                25 +
                index * 17;

            const length =
                8 +
                (
                    index % 2
                ) *
                5 +
                intensity * 4;

            line(
                centerX -
                clampX -
                5,
                lineY,
                centerX -
                clampX -
                length,
                lineY
            );

            line(
                centerX +
                clampX +
                5,
                lineY,
                centerX +
                clampX +
                length,
                lineY
            );
        }

        noStroke();
    }

    if (
        motion.eventId ===
        "spill"
    ) {
        stroke(
            247,
            183,
            113,
            lineAlpha * 0.90
        );

        strokeWidth(2);

        line(
            centerX +
                bodyHalfW +
                10,
            bodyCenterY +
                bodyHalfH *
                0.58,
            centerX +
                bodyHalfW +
                26,
            bodyCenterY +
                bodyHalfH *
                0.72
        );

        line(
            centerX +
                bodyHalfW +
                19,
            bodyCenterY +
                bodyHalfH *
                0.68,
            centerX +
                bodyHalfW +
                26,
            bodyCenterY +
                bodyHalfH *
                0.72
        );

        line(
            centerX +
                bodyHalfW +
                23,
            bodyCenterY +
                bodyHalfH *
                0.60,
            centerX +
                bodyHalfW +
                26,
            bodyCenterY +
                bodyHalfH *
                0.72
        );

        noStroke();
    }

    rectMode(CORNER);
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

        resetTokenVisualTransform(
            token1,
            y1
        );

        resetTokenVisualTransform(
            token2,
            y2
        );

        const motion1 =
            ensureTokenLiquidMotion(
                token1
            );

        const motion2 =
            ensureTokenLiquidMotion(
                token2
            );

        tween(
            0.12,
            token1,
            {
                drawX: -10,
                rot: -4,
            },
            tween.easing.quadOut
        );

        tween(
            0.12,
            token2,
            {
                drawX: 10,
                rot: 4,
            },
            tween.easing.quadOut
        );

        tween(
            0.12,
            motion1,
            {
                waveBoost: 0.8,
                stretchX: 1.04,
            },
            tween.easing.quadOut
        );

        tween(
            0.12,
            motion2,
            {
                waveBoost: 0.8,
                stretchX: 1.04,
            },
            tween.easing.quadOut,
            function() {
                tween(
                    0.28,
                    token1,
                    {
                        drawY: y2,
                        drawX: 6,
                        rot: 2,
                    },
                    tween.easing.sineInOut
                );

                tween(
                    0.28,
                    token2,
                    {
                        drawY: y1,
                        drawX: -6,
                        rot: -2,
                    },
                    tween.easing.sineInOut
                );

                tween(
                    0.28,
                    motion1,
                    {
                        waveBoost: 1.25,
                        stretchX: 1.01,
                    },
                    tween.easing.sineInOut
                );

                tween(
                    0.28,
                    motion2,
                    {
                        waveBoost: 1.25,
                        stretchX: 1.01,
                    },
                    tween.easing.sineInOut,
                    function() {
                        tween(
                            0.14,
                            token1,
                            {
                                drawX: 0,
                                rot: 0,
                            },
                            tween.easing.quadIn
                        );

                        tween(
                            0.14,
                            token2,
                            {
                                drawX: 0,
                                rot: 0,
                            },
                            tween.easing.quadIn
                        );

                        tween(
                            0.14,
                            motion1,
                            {
                                waveBoost: 0,
                                stretchX: 1,
                            },
                            tween.easing.quadOut
                        );

                        tween(
                            0.14,
                            motion2,
                            {
                                waveBoost: 0,
                                stretchX: 1,
                            },
                            tween.easing.quadOut,
                            function() {
                                slots[index1] =
                                    token2;

                                slots[index2] =
                                    token1;

                                settleTokensToCurrentSlots();
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

        resetTokenVisualTransform(
            token,
            getGlassSlotLocalY(0)
        );

        const motion =
            ensureTokenLiquidMotion(
                token
            );

        tween(
            0.16,
            motion,
            {
                waveBoost: 1.0,
                stretchX: 1.05,
            },
            tween.easing.sineInOut,
            function() {
                tween(
                    0.18,
                    motion,
                    {
                        waveBoost: 0,
                        stretchX: 1,
                    },
                    tween.easing.sineInOut,
                    function() {
                        settleTokensToCurrentSlots();
                        finishEvent();
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

    resetTokenVisualTransform(
        spilled,
        getGlassSlotLocalY(index)
    );

    const spilledMotion =
        ensureTokenLiquidMotion(
            spilled
        );

    for (
        let i = index + 1;
        i < slots.length;
        i += 1
    ) {
        const token =
            slots[i];

        resetTokenVisualTransform(
            token,
            getGlassSlotLocalY(i)
        );

        ensureTokenLiquidMotion(
            token
        );
    }

    tween(
        0.14,
        spilledMotion,
        {
            waveBoost: 1.1,
            stretchX: 1.06,
        },
        tween.easing.quadOut,
        function() {
            tween(
                CONFIG.spillMoveDuration,
                spilled,
                {
                    drawX: 28,
                    drawY:
                        getGlassSlotLocalY(
                            index
                        ) + 14,
                    rot: 8,
                },
                tween.easing.quadInOut
            );

            tween(
                CONFIG.spillMoveDuration,
                spilledMotion,
                {
                    alpha: 0,
                    fillProgress: 0.08,
                    waveBoost: 1.8,
                    surfaceLift: 5,
                    stretchX: 1.10,
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

                    clearTokenLiquidMotion(
                        spilled
                    );

                    delete spilled.drawX;
                    delete spilled.drawY;
                    delete spilled.rot;

                    gameState.glass.spilledTokens.push(
                        spilled
                    );

                    if (
                        slots.length <= 0
                    ) {
                        finishEvent();
                        return;
                    }

                    let completed =
                        0;

                    const required =
                        slots.length;

                    const onSettled =
                        function() {
                            completed += 1;

                            if (
                                completed >=
                                required
                            ) {
                                settleTokensToCurrentSlots();
                                finishEvent();
                            }
                        };

                    for (
                        let i = 0;
                        i < slots.length;
                        i += 1
                    ) {
                        const token =
                            slots[i];

                        const motion =
                            ensureTokenLiquidMotion(
                                token
                            );

                        tween(
                            0.24,
                            token,
                            {
                                drawY:
                                    getGlassSlotLocalY(
                                        i
                                    ),
                                drawX: 0,
                                rot: 0,
                            },
                            tween.easing.quadOut
                        );

                        tween(
                            0.24,
                            motion,
                            {
                                waveBoost: 0.85,
                                stretchX: 1.03,
                            },
                            tween.easing.quadOut,
                            function() {
                                tween(
                                    0.16,
                                    motion,
                                    {
                                        waveBoost: 0,
                                        stretchX: 1,
                                    },
                                    tween.easing.quadOut,
                                    onSettled
                                );
                            }
                        );
                    }
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

    if (
        gameState.shakeMotion &&
        gameState.shakeMotion.visible
    ) {
        tween(
            CONFIG.eventFinishHoldDuration,
            gameState.shakeMotion,
            {
                intensity: 0,
                alpha: 0,
                clamp: 0,
                pulse: 0,
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
                gameState.shakeMotion
            ) {
                gameState.shakeMotion.visible =
                    false;

                gameState.shakeMotion =
                    null;
            }

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


function showGarnishReveal(
    garnish,
    onComplete
) {
    gameState.phase =
        "GARNISH_REVEAL";

    const source =
        getBoardNodeScreenPosition(
            gameState.currentNodeId
        );

    const target =
        getGarnishTrayScreenPosition();

    const effect =
        gameState.garnishEffect;

    effect.visible = true;
    effect.garnish = garnish;

    effect.startX =
        source.x;

    effect.startY =
        source.y;

    effect.x =
        source.x;

    effect.y =
        source.y + 2;

    effect.targetX =
        target.x;

    effect.targetY =
        target.y;

    effect.scale = 0.42;
    effect.alpha = 0;
    effect.rotation = 0;
    effect.progress = 0;
    effect.arrivalPulse = 0;

    tween(
        CONFIG.garnishRevealDuration *
        0.42,
        effect,
        {
            y:
                source.y + 19,

            scale: 1.12,
            alpha: 255,
        },
        tween.easing.bounceOut,
        function() {
            tween(
                CONFIG.garnishRevealDuration *
                0.92,
                effect,
                {
                    x:
                        target.x,

                    y:
                        target.y + 3,

                    scale: 0.82,

                    rotation:
                        garnish === "cherry"
                            ? 210
                            : -210,

                    progress: 1,
                },
                tween.easing.sineInOut,
                function() {
                    gameState.glass.garnish =
                        garnish;

                    effect.arrivalPulse =
                        1;

                    effect.scale =
                        1.22;

                    tween(
                        0.22,
                        effect,
                        {
                            scale: 0.78,
                            arrivalPulse: 0,
                        },
                        tween.easing.bounceOut,
                        function() {
                            tween(
                                CONFIG.garnishHoldDuration *
                                0.55,
                                effect,
                                {
                                    alpha: 0,
                                    scale: 0.68,
                                },
                                tween.easing.quadIn,
                                function() {
                                    effect.visible =
                                        false;

                                    effect.garnish =
                                        null;

                                    effect.scale =
                                        1;

                                    effect.alpha =
                                        255;

                                    effect.rotation =
                                        0;

                                    effect.progress =
                                        0;

                                    effect.arrivalPulse =
                                        0;

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

function startGarnishGetEffect(
    garnish,
    onComplete
) {
    const centerX =
        WIDTH * 0.5;

    const centerY =
        HEIGHT * 0.535;

    let displayName =
        gameState.language === "ja"
            ? "添えもの"
            : "Garnish";

    let accentColor = {
        r: 232,
        g: 167,
        b: 73,
    };

    if (
        garnish === "cherry"
    ) {
        displayName =
            gameState.language === "ja"
                ? "チェリー"
                : "Cherry";

        accentColor = {
            r: 220,
            g: 74,
            b: 68,
        };
    } else if (
        garnish === "lemon"
    ) {
        displayName =
            gameState.language === "ja"
                ? "レモン"
                : "Lemon";

        accentColor = {
            r: 225,
            g: 214,
            b: 68,
        };
    }

    gameState.phase =
        "INGREDIENT_GET";

    gameState.ingredientGetEffect = {
        visible: true,
        kind: "garnish",
        garnish: garnish,
        ingredientId: null,
        displayName: displayName,
        detailText: "",
        accentColor: accentColor,
        x: centerX,
        baseY: centerY,
        y: centerY + 42,
        alpha: 0,
        scale: 0.88,
        glow: 0,
        ring: 0,
        elapsed: 0,
        inDuration: 0.20,
        holdDuration: 0.58,
        outDuration: 0.24,
        completed: false,
        onComplete: onComplete,
    };
}



function getGarnishTrayScreenPosition() {
    const geometry =
        getBottleInspectionGeometry();

    const panel =
        geometry.panel;

    const desiredX =
        geometry.centerX +
        geometry.bodyWidth *
            geometry.scale *
            0.68;

    const desiredY =
        geometry.centerY +
        (
            geometry.bodyTop +
            18
        ) *
        geometry.scale;

    return {
        x:
            Math.min(
                panel.x +
                    panel.w -
                    19,
                desiredX
            ),

        y:
            Math.min(
                panel.y +
                    panel.h -
                    25,
                desiredY
            ),
    };
}



function drawGarnishSymbol(
    garnish,
    x,
    y,
    size,
    alpha,
    rotationValue
) {
    pushMatrix();

    translate(
        x,
        y
    );

    rotate(
        rotationValue || 0
    );

    ellipseMode(CENTER);
    rectMode(CENTER);

    if (
        garnish === "cherry"
    ) {
        stroke(
            78,
            118,
            62,
            alpha
        );

        strokeWidth(
            Math.max(
                1,
                size * 0.10
            )
        );

        line(
            size * 0.08,
            size * 0.28,
            size * 0.44,
            size * 0.78
        );

        noStroke();

        fill(
            185,
            42,
            48,
            alpha
        );

        ellipse(
            0,
            0,
            size
        );

        fill(
            236,
            78,
            73,
            alpha * 0.82
        );

        ellipse(
            -size * 0.18,
            size * 0.18,
            size * 0.38
        );

        fill(
            255,
            177,
            160,
            alpha * 0.72
        );

        ellipse(
            -size * 0.22,
            size * 0.24,
            size * 0.16
        );
    } else {
        fill(
            218,
            210,
            62,
            alpha
        );

        noStroke();

        ellipse(
            0,
            0,
            size
        );

        fill(
            239,
            228,
            96,
            alpha
        );

        ellipse(
            0,
            0,
            size * 0.72
        );

        fill(
            63,
            96,
            46,
            alpha
        );

        ellipse(
            0,
            0,
            size * 0.24
        );

        stroke(
            255,
            246,
            165,
            alpha * 0.72
        );

        strokeWidth(
            Math.max(
                1,
                size * 0.07
            )
        );

        line(
            0,
            -size * 0.36,
            0,
            size * 0.36
        );

        line(
            -size * 0.36,
            0,
            size * 0.36,
            0
        );

        noStroke();
    }

    rectMode(CORNER);

    popMatrix();
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
        tween.easing.bounceOut,
        function() {
            if (onComplete) {
                onComplete();
            }
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
    const geometry =
        getBottleInspectionGeometry();

    return {
        centerX:
            geometry.centerX,

        centerY:
            geometry.centerY +
            (
                geometry.bodyBottom +
                geometry.bodyTop
            ) *
            geometry.scale *
            0.5,

        scale:
            geometry.scale,

        glassH:
            geometry.bodyTop -
            geometry.bodyBottom,

        topW:
            geometry.bodyWidth,

        bottomW:
            geometry.bodyWidth,

        left:
            geometry.centerX -
            geometry.bodyWidth *
                geometry.scale *
                0.5,

        right:
            geometry.centerX +
            geometry.bodyWidth *
                geometry.scale *
                0.5,

        bottom:
            geometry.centerY +
            geometry.bodyBottom *
                geometry.scale,

        top:
            geometry.centerY +
            geometry.bodyTop *
                geometry.scale,
    };
}

function getBottleInspectionGeometry() {
    const panel =
        layout.glass;

    const scaleValue =
        Math.min(
            panel.w / 142,
            panel.h / 286,
            0.92
        );

    const centerX =
        panel.x +
        panel.w * 0.5;

    const centerY =
        panel.y +
        panel.h * 0.43;

    const bodyBottom =
        -CONFIG.inspectionBottleBodyHeight *
        0.5 -
        18;

    const bodyTop =
        CONFIG.inspectionBottleBodyHeight *
        0.5 -
        18;

    const shoulderY =
        bodyTop + 7;

    const neckBottom =
        bodyTop + 17;

    const neckTop =
        neckBottom +
        CONFIG.inspectionBottleNeckHeight;

    return {
        panel: panel,
        centerX: centerX,
        centerY: centerY,
        scale: scaleValue,

        bodyWidth:
            CONFIG.inspectionBottleBodyWidth,

        bodyHeight:
            CONFIG.inspectionBottleBodyHeight,

        bodyBottom:
            bodyBottom,

        bodyTop:
            bodyTop,

        shoulderY:
            shoulderY,

        neckBottom:
            neckBottom,

        neckTop:
            neckTop,

        neckWidth:
            CONFIG.inspectionBottleNeckWidth,

        mouthWidth:
            CONFIG.inspectionBottleMouthWidth,

        mouthHeight:
            CONFIG.inspectionBottleMouthHeight,
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
    const ingredient =
        INGREDIENTS[
            ingredientId
        ];

    if (!ingredient) {
        gameState.flyingIngredient =
            null;

        gameState.phase =
            "WAIT_CAP_POWER";

        return;
    }

    startIngredientGetEffect(
        ingredientId,
        function() {
            if (
                ingredientId === "ice"
            ) {
                startBottleCooling();
                return;
            }

            beginIngredientFlightAfterGet(
                ingredientId
            );
        }
    );
}


function startIngredientGetEffect(
    ingredientId,
    onComplete
) {
    const ingredient =
        INGREDIENTS[
            ingredientId
        ];

    if (!ingredient) {
        gameState.flyingIngredient =
            null;

        gameState.phase =
            "WAIT_CAP_POWER";

        return;
    }

    const isCooling =
        ingredientId === "ice";

    const centerX =
        WIDTH * 0.5;

    const centerY =
        HEIGHT * 0.535;

    gameState.phase =
        "INGREDIENT_GET";

    gameState.ingredientGetEffect = {
        visible: true,
        kind: isCooling
            ? "cooling"
            : "ingredient",
        ingredientId: ingredientId,
        displayName: isCooling
            ? (
                gameState.language === "ja"
                    ? "冷却"
                    : "Cooling"
            )
            : "",
        detailText: "",
        x: centerX,
        baseY: centerY,
        y: centerY + 42,
        alpha: 0,
        scale: 0.88,
        glow: 0,
        ring: 0,
        elapsed: 0,
        inDuration: 0.20,
        holdDuration: 0.68,
        outDuration: 0.24,
        completed: false,
        onComplete: onComplete,
    };
}

function startCarbonationGetEffect(
    onComplete
) {
    const centerX =
        WIDTH * 0.5;

    const centerY =
        HEIGHT * 0.535;

    gameState.phase =
        "INGREDIENT_GET";

    gameState.ingredientGetEffect = {
        visible: true,
        kind: "carbonation",
        ingredientId: null,
        displayName:
            gameState.language === "ja"
                ? "炭酸水"
                : "Sparkling Water",
        detailText: "",
        accentColor: {
            r: 178,
            g: 224,
            b: 255,
        },
        x: centerX,
        baseY: centerY,
        y: centerY + 42,
        alpha: 0,
        scale: 0.88,
        glow: 0,
        ring: 0,
        elapsed: 0,
        inDuration: 0.20,
        holdDuration: 0.68,
        outDuration: 0.24,
        completed: false,
        onComplete: onComplete,
    };
}



function updateIngredientGetEffect() {
    const effect =
        gameState.ingredientGetEffect;

    if (
        !effect ||
        !effect.visible ||
        effect.completed
    ) {
        return;
    }

    effect.elapsed +=
        Math.max(
            0,
            DeltaTime
        );

    const inDuration =
        effect.inDuration || 0.20;

    const holdDuration =
        effect.holdDuration || 0.68;

    const outDuration =
        effect.outDuration || 0.24;

    const totalDuration =
        inDuration +
        holdDuration +
        outDuration;

    if (
        effect.elapsed >=
        totalDuration
    ) {
        const onComplete =
            effect.onComplete;

        effect.completed = true;
        effect.visible = false;
        effect.alpha = 0;

        gameState.ingredientGetEffect =
            null;

        if (onComplete) {
            onComplete();
        }
    }
}



function beginIngredientFlightAfterGet(
    ingredientId
) {
    const ingredient =
        INGREDIENTS[
            ingredientId
        ];

    if (!ingredient) {
        gameState.flyingIngredient =
            null;

        gameState.phase =
            "WAIT_CAP_POWER";

        return;
    }

    completeIngredientAddition(
        ingredientId
    );
}



function drawIngredientGetEffect() {
    const effect =
        gameState.ingredientGetEffect;

    if (
        !effect ||
        !effect.visible
    ) {
        return;
    }

    const ingredient =
        effect.ingredientId
            ? INGREDIENTS[
                effect.ingredientId
            ]
            : null;

    if (
        !ingredient &&
        !effect.displayName
    ) {
        return;
    }

    const elapsed =
        effect.elapsed || 0;

    const inDuration =
        effect.inDuration || 0.20;

    const holdDuration =
        effect.holdDuration || 0.68;

    const outDuration =
        effect.outDuration || 0.24;

    const baseY =
        effect.baseY || HEIGHT * 0.535;

    let alpha = 255;
    let y = baseY;
    let scaleValue = 1;
    let glow = 1;
    let ring = 0.42;

    if (
        elapsed <
        inDuration
    ) {
        const t =
            Math.max(
                0,
                Math.min(
                    1,
                    elapsed /
                        inDuration
                )
            );

        const ease =
            1 -
            Math.pow(
                1 - t,
                2
            );

        alpha =
            255 * ease;

        y =
            baseY +
            42 *
                (1 - ease);

        scaleValue =
            0.88 +
            0.12 * ease;

        glow = ease;
        ring =
            0.42 * ease;
    } else if (
        elapsed <
        inDuration +
            holdDuration
    ) {
        const t =
            (
                elapsed -
                inDuration
            ) /
            holdDuration;

        alpha = 255;
        y = baseY;

        scaleValue =
            1 +
            Math.sin(
                t * Math.PI
            ) *
                0.018;

        glow =
            1 - t * 0.18;

        ring =
            0.42 + t * 0.18;
    } else {
        const t =
            Math.max(
                0,
                Math.min(
                    1,
                    (
                        elapsed -
                        inDuration -
                        holdDuration
                    ) /
                        outDuration
                )
            );

        const ease = t * t;

        alpha =
            255 *
            (1 - ease);

        y =
            baseY +
            48 * ease;

        scaleValue =
            1 -
            0.06 * ease;

        glow =
            0.82 *
            (1 - ease);

        ring =
            0.60 +
            0.40 * ease;
    }

    const colorValue =
        effect.accentColor ||
        (
            ingredient &&
            ingredient.color
                ? ingredient.color
                : {}
        );

    const accentR =
        colorValue.r === undefined
            ? 232
            : colorValue.r;

    const accentG =
        colorValue.g === undefined
            ? 167
            : colorValue.g;

    const accentB =
        colorValue.b === undefined
            ? 73
            : colorValue.b;

    const panelW =
        Math.min(
            230,
            WIDTH * 0.58
        );

    const panelH =
        Math.min(
            154,
            HEIGHT * 0.19
        );

    const panelOffsetY = 10;

    const iconCenterY =
        panelOffsetY +
        panelH * 0.12;

    const nameY =
        panelOffsetY -
        panelH * 0.30;

    const dividerY =
        panelOffsetY -
        panelH * 0.10;

    const detailY =
        panelOffsetY +
        panelH * 0.31;

    const iconSize =
        Math.min(
            34,
            WIDTH * 0.084
        );

    const name =
        effect.displayName ||
        ingredient[
            gameState.language
        ] ||
        ingredient.en ||
        "";

    const detailText =
        effect.detailText || "";

    pushMatrix();

    translate(
        effect.x,
        y
    );

    scale(
        scaleValue,
        scaleValue
    );

    rectMode(CENTER);
    noStroke();

    fill(
        4,
        3,
        3,
        alpha * 0.28
    );

    ellipse(
        8,
        panelOffsetY -
            panelH * 0.53,
        panelW * 0.82,
        18
    );

    fill(
        20,
        13,
        11,
        alpha * 0.92
    );

    rect(
        0,
        panelOffsetY,
        panelW,
        panelH,
        17
    );

    fill(
        63,
        35,
        23,
        alpha * 0.42
    );

    rect(
        0,
        panelOffsetY +
            panelH * 0.06,
        panelW - 16,
        panelH - 18,
        13
    );

    noFill();

    stroke(
        202,
        139,
        68,
        alpha * 0.88
    );

    strokeWidth(2);

    rect(
        0,
        panelOffsetY,
        panelW,
        panelH,
        17
    );

    stroke(
        255,
        223,
        158,
        alpha * 0.36
    );

    strokeWidth(1);

    rect(
        0,
        panelOffsetY,
        panelW - 9,
        panelH - 9,
        13
    );

    noFill();

    stroke(
        accentR,
        accentG,
        accentB,
        alpha *
            (
                0.18 +
                glow * 0.32
            )
    );

    strokeWidth(2);

    ellipse(
        0,
        iconCenterY,
        iconSize * 1.74 +
            ring * 18
    );

    noStroke();

    fill(
        255,
        239,
        190,
        alpha * 0.13
    );

    ellipse(
        0,
        iconCenterY,
        iconSize * 1.56
    );

    drawGetPopupIcon(
        effect,
        0,
        iconCenterY,
        iconSize,
        alpha
    );

    fill(
        255,
        229,
        169,
        alpha
    );

    fontSize(
        Math.min(
            18,
            WIDTH * 0.044
        )
    );

    textAlign(CENTER);

    text(
        name,
        0,
        nameY
    );

    stroke(
        184,
        112,
        55,
        alpha * 0.62
    );

    strokeWidth(1.2);

    line(
        -panelW * 0.28,
        dividerY,
        panelW * 0.28,
        dividerY
    );

    if (detailText) {
        noStroke();

        fill(
            accentR,
            accentG,
            accentB,
            alpha * 0.82
        );

        fontSize(
            Math.min(
                10,
                WIDTH * 0.026
            )
        );

        text(
            detailText,
            0,
            detailY
        );
    }

    noStroke();

    fill(
        255,
        244,
        210,
        alpha * 0.42
    );

    ellipse(
        -panelW * 0.32,
        panelOffsetY +
            panelH * 0.25,
        3
    );

    fill(
        207,
        239,
        244,
        alpha * 0.30
    );

    ellipse(
        panelW * 0.34,
        panelOffsetY +
            panelH * 0.20,
        2.6
    );

    rectMode(CORNER);

    popMatrix();

    noStroke();
}


function drawGetPopupIcon(
    effect,
    x,
    y,
    size,
    alpha
) {
    if (!effect) {
        return;
    }

    if (
        effect.kind ===
        "garnish"
    ) {
        if (
            typeof drawGarnishSymbol ===
            "function"
        ) {
            drawGarnishSymbol(
                effect.garnish,
                x,
                y,
                size * 0.92,
                alpha,
                effect.garnish === "cherry"
                    ? -16
                    : 12
            );

            return;
        }

        pushMatrix();

        translate(
            x,
            y
        );

        noStroke();

        if (
            effect.garnish ===
            "cherry"
        ) {
            fill(
                220,
                74,
                68,
                alpha
            );

            ellipse(
                0,
                0,
                size * 0.58
            );

            stroke(
                86,
                132,
                72,
                alpha
            );

            strokeWidth(
                Math.max(
                    1,
                    size * 0.08
                )
            );

            line(
                size * 0.08,
                size * 0.20,
                size * 0.26,
                size * 0.44
            );
        } else {
            noFill();

            stroke(
                225,
                214,
                68,
                alpha
            );

            strokeWidth(
                Math.max(
                    2,
                    size * 0.12
                )
            );

            ellipse(
                0,
                0,
                size * 0.62
            );

            stroke(
                88,
                138,
                72,
                alpha
            );

            strokeWidth(
                Math.max(
                    1,
                    size * 0.06
                )
            );

            ellipse(
                0,
                0,
                size * 0.28
            );
        }

        noStroke();

        popMatrix();

        return;
    }

    if (
        effect.kind ===
        "carbonation"
    ) {
        pushMatrix();

        translate(
            x,
            y
        );

        noStroke();

        fill(
            185,
            230,
            255,
            alpha * 0.22
        );

        ellipse(
            0,
            0,
            size * 0.92
        );

        fill(
            206,
            241,
            255,
            alpha * 0.92
        );

        ellipse(
            -size * 0.12,
            size * 0.08,
            size * 0.16
        );

        ellipse(
            size * 0.10,
            -size * 0.02,
            size * 0.21
        );

        ellipse(
            0,
            -size * 0.18,
            size * 0.28
        );

        noFill();

        stroke(
            232,
            248,
            255,
            alpha * 0.88
        );

        strokeWidth(
            Math.max(
                1.2,
                size * 0.05
            )
        );

        ellipse(
            -size * 0.18,
            size * 0.16,
            size * 0.16
        );

        ellipse(
            size * 0.20,
            size * 0.04,
            size * 0.20
        );

        ellipse(
            0,
            -size * 0.18,
            size * 0.28
        );

        stroke(
            168,
            214,
            245,
            alpha * 0.72
        );

        strokeWidth(
            Math.max(
                1,
                size * 0.04
            )
        );

        line(
            -size * 0.24,
            -size * 0.26,
            size * 0.24,
            -size * 0.26
        );

        noStroke();

        popMatrix();

        return;
    }

    if (
        effect.ingredientId &&
        typeof drawIngredientIcon ===
            "function"
    ) {
        drawIngredientIcon(
            effect.ingredientId,
            x,
            y,
            size,
            alpha
        );

        return;
    }

    pushMatrix();

    translate(
        x,
        y
    );

    noStroke();

    fill(
        232,
        167,
        73,
        alpha * 0.90
    );

    ellipse(
        0,
        0,
        size * 0.72
    );

    fill(
        255,
        230,
        170,
        alpha * 0.38
    );

    ellipse(
        -size * 0.15,
        -size * 0.14,
        size * 0.18
    );

    popMatrix();
}



function drawIngredientGetBackdrop() {

    const effect =

        gameState.ingredientGetEffect;

    if (

        !effect ||

        !effect.visible

    ) {

        return;

    }

    const panel =

        layout.board;

    if (!panel) {

        return;

    }

    const elapsed =

        effect.elapsed || 0;

    const inDuration =

        effect.inDuration || 0.20;

    const holdDuration =

        effect.holdDuration || 0.68;

    const outDuration =

        effect.outDuration || 0.24;

    let fade = 1;

    if (

        elapsed <

        inDuration

    ) {

        fade =

            Math.max(

                0,

                Math.min(

                    1,

                    elapsed /

                        inDuration

                )

            );

    } else if (

        elapsed >

        inDuration +

            holdDuration

    ) {

        fade =

            1 -

            Math.max(

                0,

                Math.min(

                    1,

                    (

                        elapsed -

                        inDuration -

                        holdDuration

                    ) /

                    outDuration

                )

            );

    }

    rectMode(CORNER);

    noStroke();

    fill(

        0,

        0,

        0,

        88 * fade

    );

    rect(

        panel.x + 6,

        panel.y + 6,

        panel.w - 12,

        panel.h - 12,

        18

    );

    fill(

        25,

        12,

        6,

        34 * fade

    );

    rect(

        panel.x + 18,

        panel.y + 18,

        panel.w - 36,

        panel.h - 36,

        14

    );

    noStroke();

}


function startBottleCooling() {
    gameState.phase =
        "COOLING_BOTTLE";

    gameState.chillCount =
        Math.min(
            CONFIG.coolingMaxLevel,
            (
                gameState.chillCount ||
                0
            ) +
            1
        );

    const effect =
        gameState.coolingEffect;

    effect.visible = true;
    effect.nodeId =
        gameState.currentNodeId;
    effect.progress = 0;
    effect.pulse = 0;
    effect.alpha = 0;

    gameState.glassPulse.scale =
        0.92;

    tween(
        CONFIG.coolingRevealDuration,
        gameState.glassPulse,
        {
            scale: 1.06,
        },
        tween.easing.bounceOut,
        function() {
            tween(
                CONFIG.coolingFadeDuration,
                gameState.glassPulse,
                {
                    scale: 1,
                },
                tween.easing.quadOut
            );
        }
    );

    tween(
        CONFIG.coolingRevealDuration,
        effect,
        {
            progress: 1,
            pulse: 1,
            alpha: 255,
        },
        tween.easing.quadOut,
        function() {
            const holdTimer = {
                value: 0,
            };

            tween(
                CONFIG.coolingHoldDuration,
                holdTimer,
                {
                    value: 1,
                },
                tween.easing.linear,
                function() {
                    tween(
                        CONFIG.coolingFadeDuration,
                        effect,
                        {
                            progress: 1.35,
                            pulse: 0,
                            alpha: 0,
                        },
                        tween.easing.quadIn,
                        function() {
                            effect.visible =
                                false;

                            effect.nodeId =
                                null;

                            effect.progress =
                                0;

                            effect.pulse =
                                0;

                            effect.alpha =
                                0;

                            gameState.phase =
                                "WAIT_CAP_POWER";
                        }
                    );
                }
            );
        }
    );
}

function getBottleChillCount() {
    let legacyIceCount = 0;

    if (
        gameState.glass &&
        gameState.glass.slots
    ) {
        for (
            const token of
            gameState.glass.slots
        ) {
            if (
                token.ingredientId ===
                "ice"
            ) {
                legacyIceCount += 1;
            }
        }
    }

    return Math.min(
        CONFIG.coolingMaxLevel,
        (
            gameState.chillCount ||
            0
        ) +
        legacyIceCount
    );
}

function drawBottleChillIndicator() {
    const chillCount =
        getBottleChillCount();

    if (chillCount <= 0) {
        return;
    }

    const geometry =
        getBottleInspectionGeometry();

    const alpha =
        42 +
        chillCount * 24;

    pushMatrix();

    translate(
        geometry.centerX,
        geometry.centerY
    );

    scale(
        geometry.scale,
        geometry.scale
    );

    noFill();

    stroke(
        205,
        238,
        248,
        alpha * 0.68
    );

    strokeWidth(
        0.9 +
        chillCount * 0.18
    );

    line(
        -geometry.bodyWidth *
            0.41,
        geometry.bodyBottom + 30,
        -geometry.bodyWidth *
            0.38,
        geometry.bodyTop - 28
    );

    stroke(
        232,
        250,
        255,
        alpha * 0.28
    );

    strokeWidth(0.9);

    line(
        geometry.bodyWidth *
            0.38,
        geometry.bodyBottom + 36,
        geometry.bodyWidth *
            0.34,
        geometry.bodyTop - 44
    );

    noStroke();

    const dotCount =
        Math.min(
            5,
            2 + chillCount
        );

    for (
        let index = 0;
        index < dotCount;
        index += 1
    ) {
        const side =
            index % 2 === 0
                ? -1
                : 1;

        const x =
            side *
            (
                geometry.bodyWidth *
                    0.20 +
                (
                    index % 2
                ) *
                    5
            );

        const y =
            geometry.bodyBottom +
            48 +
            index * 24;

        fill(
            232,
            252,
            255,
            alpha * 0.34
        );

        ellipse(
            x,
            y,
            2.2 +
            chillCount * 0.14
        );
    }

    noStroke();

    rectMode(CORNER);

    popMatrix();
}


function drawBottleCoolingEffect() {
    const effect =
        gameState.coolingEffect;

    if (
        !effect ||
        !effect.visible
    ) {
        return;
    }

    const nodePosition =
        getBoardNodeScreenPosition(
            effect.nodeId
        );

    const boardBottleX =
        nodePosition.x;

    const boardBottleY =
        nodePosition.y +
        CONFIG.boardBottleRailOffset;

    const geometry =
        getBottleInspectionGeometry();

    const progress =
        effect.progress;

    const pulse =
        effect.pulse;

    const alpha =
        effect.alpha;

    const ringProgress =
        Math.max(
            0,
            Math.min(
                1,
                progress
            )
        );

    noFill();

    stroke(
        202,
        238,
        249,
        alpha * 0.66
    );

    strokeWidth(
        1.8 +
        pulse * 1.1
    );

    ellipse(
        boardBottleX,
        boardBottleY,
        CONFIG.coolingBoardRingSize *
        (
            0.70 +
            ringProgress * 0.42
        )
    );

    stroke(
        235,
        251,
        255,
        alpha * 0.22
    );

    strokeWidth(1.1);

    ellipse(
        boardBottleX,
        boardBottleY,
        CONFIG.coolingBoardRingSize *
        (
            1.00 +
            ringProgress * 0.54
        )
    );

    const mistCount = 6;

    noStroke();

    for (
        let index = 0;
        index < mistCount;
        index += 1
    ) {
        const angle =
            (
                index /
                mistCount
            ) *
            Math.PI *
            2 +
            progress * 2.0;

        const distance =
            10 +
            ringProgress * 18;

        const mistX =
            boardBottleX +
            Math.cos(
                angle
            ) *
            distance;

        const mistY =
            boardBottleY +
            Math.sin(
                angle
            ) *
            distance *
            0.60;

        fill(
            220,
            246,
            252,
            alpha * 0.22
        );

        ellipse(
            mistX,
            mistY,
            3.4
        );
    }

    pushMatrix();

    translate(
        geometry.centerX,
        geometry.centerY
    );

    scale(
        geometry.scale,
        geometry.scale
    );

    noFill();

    stroke(
        205,
        239,
        248,
        alpha *
        (
            0.28 +
            pulse * 0.10
        )
    );

    strokeWidth(
        1.2 +
        pulse * 0.4
    );

    line(
        -geometry.bodyWidth *
            0.42,
        geometry.bodyBottom + 28,
        -geometry.bodyWidth *
            0.45,
        geometry.bodyTop - 32
    );

    stroke(
        235,
        253,
        255,
        alpha * 0.16
    );

    strokeWidth(1.0);

    line(
        geometry.bodyWidth *
            0.39,
        geometry.bodyBottom + 34,
        geometry.bodyWidth *
            0.34,
        geometry.bodyTop - 46
    );

    noStroke();

    for (
        let index = 0;
        index < 4;
        index += 1
    ) {
        const side =
            index % 2 === 0
                ? -1
                : 1;

        const x =
            side *
            geometry.bodyWidth *
            0.22;

        const y =
            geometry.bodyBottom +
            46 +
            index * 26;

        fill(
            230,
            252,
            255,
            alpha *
            (
                0.14 +
                pulse * 0.05
            )
        );

        ellipse(
            x,
            y,
            2.6
        );
    }

    rectMode(CORNER);

    popMatrix();

    noStroke();
}

function drawBottleCoolingFog() {
    const effect =
        gameState.coolingEffect;

    if (
        !effect ||
        !effect.visible
    ) {
        return;
    }

    const geometry =
        getBottleInspectionGeometry();

    const nativeContext =
        typeof CodeaLite !==
            "undefined" &&
        CodeaLite.state
            ? CodeaLite.state.ctx
            : null;

    if (!nativeContext) {
        return;
    }

    const progress =
        Math.max(
            0,
            effect.progress || 0
        );

    const alphaRatio =
        Math.max(
            0,
            Math.min(
                1,
                (effect.alpha || 0) /
                    255
            )
        );

    const fogPeak =
        Math.max(
            0,
            1 -
            Math.abs(
                progress - 0.64
            ) /
            0.58
        );

    const fogAlpha =
        alphaRatio *
        (
            0.06 +
            fogPeak * 0.34
        );

    if (fogAlpha <= 0.01) {
        return;
    }

    pushMatrix();

    translate(
        geometry.centerX,
        geometry.centerY
    );

    scale(
        geometry.scale *
            gameState.glassPulse.scale,
        geometry.scale *
            gameState.glassPulse.scale
    );

    const ctx =
        nativeContext;

    const bodyCenterY =
        geometry.bodyTop +
        (
            geometry.bodyBottom -
            geometry.bodyTop
        ) *
        0.52;

    ctx.save();

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        5
    );

    ctx.clip();

    const verticalFog =
        ctx.createLinearGradient(
            0,
            geometry.neckTop,
            0,
            geometry.bodyBottom
        );

    verticalFog.addColorStop(
        0,
        "rgba(244, 253, 255, 0)"
    );

    verticalFog.addColorStop(
        0.22,
        "rgba(244, 253, 255, " +
        String(
            fogAlpha * 0.42
        ) +
        ")"
    );

    verticalFog.addColorStop(
        0.58,
        "rgba(248, 255, 255, " +
        String(
            fogAlpha * 0.76
        ) +
        ")"
    );

    verticalFog.addColorStop(
        1,
        "rgba(244, 253, 255, 0)"
    );

    ctx.fillStyle =
        verticalFog;

    ctx.fillRect(
        -geometry.bodyWidth,
        geometry.neckTop - 12,
        geometry.bodyWidth * 2,
        geometry.bodyBottom -
            geometry.neckTop +
            24
    );

    const centerFog =
        ctx.createRadialGradient(
            -geometry.bodyWidth * 0.08,
            bodyCenterY,
            geometry.bodyWidth * 0.06,
            0,
            bodyCenterY,
            geometry.bodyWidth * 0.74
        );

    centerFog.addColorStop(
        0,
        "rgba(255, 255, 255, " +
        String(
            fogAlpha * 0.88
        ) +
        ")"
    );

    centerFog.addColorStop(
        0.48,
        "rgba(240, 252, 255, " +
        String(
            fogAlpha * 0.42
        ) +
        ")"
    );

    centerFog.addColorStop(
        1,
        "rgba(240, 252, 255, 0)"
    );

    ctx.fillStyle =
        centerFog;

    ctx.fillRect(
        -geometry.bodyWidth,
        geometry.bodyTop - 18,
        geometry.bodyWidth * 2,
        geometry.bodyBottom -
            geometry.bodyTop +
            36
    );

    ctx.restore();

    popMatrix();
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

function getBoardBottleMouthScreenPosition(
    nodeId
) {
    const nodePosition =
        getBoardNodeScreenPosition(
            nodeId
        );

    const angle =
        (
            CONFIG.boardBottleBaseRotation ||
            0
        ) *
        Math.PI /
        180;

    const localMouthY =
        -CONFIG.boardBottleHeight *
        0.75;

    const bottleScale = 1;

    const rotatedMouthX =
        -localMouthY *
        Math.sin(angle) *
        bottleScale;

    const rotatedMouthY =
        localMouthY *
        Math.cos(angle) *
        bottleScale;

    return {
        x:
            nodePosition.x +
            rotatedMouthX,

        y:
            nodePosition.y +
            CONFIG.boardBottleRailOffset -
            (
                CONFIG.boardBottleScreenLift ||
                0
            ) +
            rotatedMouthY +
            CONFIG.ingredientBottleMouthInsetY,
    };
}

function getBoardNozzleTipScreenPosition(
    nodeId
) {
    const nodePosition =
        getBoardNodeScreenPosition(
            nodeId
        );

    return {
        x:
            nodePosition.x,

        y:
            nodePosition.y +
            CONFIG.boardBottleDockTipY -
            1,
    };
}



function getGlassSlotScreenPosition(
    slotIndex
) {
    const geometry =
        getBottleInspectionGeometry();

    return {
        x:
            geometry.centerX,

        y:
            geometry.centerY +
            getGlassSlotLocalY(
                slotIndex
            ) *
            geometry.scale,
    };
}


function getGlassSlotLocalY(
    slotIndex
) {
    const innerBottom =
        CONFIG.inspectionBottleInnerBottom;

    const innerTop =
        CONFIG.inspectionBottleInnerTop;

    const slotHeight =
        (
            innerTop -
            innerBottom
        ) /
        CONFIG.glassCapacity;

    return (
        innerBottom +
        slotHeight *
            (
                slotIndex +
                0.5
            )
    );
}

function drawBottleInspectionPanel() {
    const geometry =
        getBottleInspectionGeometry();

    const panel =
        geometry.panel;

    clip(
        panel.x,
        panel.y,
        panel.w,
        panel.h
    );

    const shakeActive =
        typeof isEventActionPhase ===
            "function" &&
        isEventActionPhase();

    const shakeX =
        shakeActive
            ? Math.sin(
                ElapsedTime * 42
            ) * 5
            : 0;

    const shakeRotation =
        shakeActive
            ? Math.sin(
                ElapsedTime * 37
            ) * 3
            : 0;

    pushMatrix();

    translate(
        geometry.centerX +
            shakeX,
        geometry.centerY
    );

    rotate(
        shakeRotation
    );

    scale(
        geometry.scale *
            gameState.glassPulse.scale,
        geometry.scale *
            gameState.glassPulse.scale
    );

    const nativeContext =
        typeof CodeaLite !==
            "undefined" &&
        CodeaLite.state
            ? CodeaLite.state.ctx
            : null;

    if (!nativeContext) {
        popMatrix();
        clip();
        return;
    }

    const ctx =
        nativeContext;

    ctx.save();

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        -4
    );

    ctx.fillStyle =
        "rgba(5, 3, 2, 0.42)";

    ctx.setTransform(
        ctx.getTransform()
    );

    ctx.translate(
        5,
        -8
    );

    ctx.fill();

    ctx.restore();

    ctx.save();

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        0
    );

    ctx.fillStyle =
        "rgba(32, 20, 14, 0.94)";

    ctx.strokeStyle =
        "rgba(225, 207, 174, 0.54)";

    ctx.lineWidth = 3;

    ctx.fill();
    ctx.stroke();

    ctx.restore();

    ctx.save();

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        6
    );

    ctx.fillStyle =
        "rgba(92, 57, 31, 0.38)";

    ctx.fill();

    ctx.clip();

    const slots =
        gameState.glass.slots;

    const slotHeight =
        (
            CONFIG.inspectionBottleInnerTop -
            CONFIG.inspectionBottleInnerBottom
        ) /
        CONFIG.glassCapacity;

    for (
        let index = 0;
        index < slots.length;
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

        const baseY =
            getGlassSlotLocalY(
                index
            );

        const drawY =
            token.drawY ===
            undefined
                ? baseY
                : token.drawY;

        const drawX =
            token.drawX ===
            undefined
                ? 0
                : token.drawX;

        const rotation =
            token.rot ===
            undefined
                ? 0
                : token.rot;

        ctx.save();

        ctx.translate(
            drawX,
            drawY
        );

        ctx.rotate(
            rotation *
                Math.PI /
                180
        );

        drawInspectionBottleLiquidBand(
            ctx,
            geometry,
            ingredient,
            slotHeight,
            index
        );

        ctx.restore();

        pushMatrix();

        translate(
            drawX,
            drawY
        );

        rotate(
            rotation
        );

        drawIngredientIcon(
            token.ingredientId,
            0,
            0,
            Math.min(
                13,
                slotHeight * 0.52
            ),
            205
        );

        popMatrix();
    }

    if (
        slots.length > 0
    ) {
        const liquidTop =
            getGlassSlotLocalY(
                slots.length - 1
            ) +
            slotHeight * 0.43;

        const wave =
            Math.sin(
                ElapsedTime * 2.6
            ) * 1.8;

        ctx.beginPath();

        ctx.moveTo(
            -geometry.bodyWidth,
            liquidTop
        );

        ctx.bezierCurveTo(
            -geometry.bodyWidth *
                0.35,
            liquidTop + wave,
            geometry.bodyWidth *
                0.35,
            liquidTop - wave,
            geometry.bodyWidth,
            liquidTop
        );

        ctx.strokeStyle =
            "rgba(255, 228, 176, 0.34)";

        ctx.lineWidth = 1.5;

        ctx.stroke();
    }

    const pressure =
        gameState.glass.pressure;

    if (pressure > 0) {
        const bubbleCount =
            Math.min(
                16,
                pressure * 4
            );

        for (
            let index = 0;
            index < bubbleCount;
            index += 1
        ) {
            const bubbleX =
                Math.sin(
                    index * 7.31
                ) *
                geometry.bodyWidth *
                0.28;

            const travel =
                (
                    ElapsedTime * 18 +
                    index * 17
                ) %
                (
                    CONFIG.inspectionBottleInnerTop -
                    CONFIG.inspectionBottleInnerBottom
                );

            const bubbleY =
                CONFIG.inspectionBottleInnerBottom +
                travel;

            const bubbleSize =
                2.4 +
                (
                    index % 4
                ) * 0.75;

            ctx.beginPath();

            ctx.ellipse(
                bubbleX,
                bubbleY,
                bubbleSize * 0.5,
                bubbleSize * 0.5,
                0,
                0,
                Math.PI * 2
            );

            ctx.strokeStyle =
                "rgba(218, 244, 249, 0.56)";

            ctx.lineWidth = 1;

            ctx.stroke();
        }
    }

    const amberOverlay =
        ctx.createLinearGradient(
            -geometry.bodyWidth * 0.5,
            0,
            geometry.bodyWidth * 0.5,
            0
        );

    amberOverlay.addColorStop(
        0,
        "rgba(25, 12, 7, 0.22)"
    );

    amberOverlay.addColorStop(
        0.28,
        "rgba(214, 145, 74, 0.06)"
    );

    amberOverlay.addColorStop(
        0.72,
        "rgba(90, 43, 20, 0.04)"
    );

    amberOverlay.addColorStop(
        1,
        "rgba(17, 8, 5, 0.30)"
    );

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        7
    );

    ctx.fillStyle =
        amberOverlay;

    ctx.fill();

    ctx.restore();

    drawInspectionBottleVectorHighlights(
        ctx,
        geometry
    );

    drawPendingBottleGarnish(
        geometry
    );

    if (
        gameState.glass.garnish
    ) {
        const garnishX =
            geometry.bodyWidth *
            0.64;

        const garnishY =
            geometry.bodyTop + 18;

        fill(
            20,
            13,
            10,
            225
        );

        noStroke();

        ellipse(
            garnishX,
            garnishY,
            22
        );

        noFill();

        stroke(
            218,
            169,
            99,
            165
        );

        strokeWidth(1.5);

        ellipse(
            garnishX,
            garnishY,
            22
        );

        noStroke();

        if (
            gameState.glass.garnish ===
            "cherry"
        ) {
            fill(
                211,
                61,
                58,
                235
            );

            ellipse(
                garnishX,
                garnishY,
                8
            );

            fill(
                255,
                157,
                145,
                170
            );

            ellipse(
                garnishX - 2,
                garnishY + 2,
                2.5
            );
        } else {
            noFill();

            stroke(
                228,
                218,
                75,
                235
            );

            strokeWidth(3);

            ellipse(
                garnishX,
                garnishY,
                9
            );

            stroke(
                82,
                127,
                65,
                220
            );

            strokeWidth(1.2);

            line(
                garnishX - 4,
                garnishY,
                garnishX + 4,
                garnishY
            );

            noStroke();
        }
    }

    rectMode(CORNER);
    ellipseMode(CENTER);

    popMatrix();

    clip();
}


drawPendingBottleGarnish = function(
    geometry
) {
    const garnishes =
        getVisibleBottleGarnishes();

    if (
        garnishes.length <= 0
    ) {
        return;
    }

    const effect =
        gameState.ingredientGetEffect;

    const activeGarnish =
        effect &&
        effect.visible &&
        effect.kind === "garnish"
            ? effect.garnish
            : null;

    const isDouble =
        garnishes.length >= 2;

    const pulse =
        1 +
        Math.sin(
            ElapsedTime * 4.6
        ) *
            0.03;

    const dishX =
        -geometry.bodyWidth *
        (
            isDouble
                ? 0.56
                : 0.72
        );

    const dishY =
        geometry.bodyTop + 22;

    const dishW =
        isDouble
            ? 35
            : 24;

    const dishH =
        isDouble
            ? 13
            : 11;

    noStroke();

    fill(
        10,
        8,
        7,
        78
    );

    ellipse(
        dishX + 2,
        dishY -
            dishH * 0.66,
        dishW * 0.90,
        dishH * 0.64
    );

    fill(
        30,
        19,
        14,
        230
    );

    ellipse(
        dishX,
        dishY,
        dishW,
        dishH
    );

    noFill();

    stroke(
        218,
        169,
        99,
        150
    );

    strokeWidth(1.4);

    ellipse(
        dishX,
        dishY,
        dishW,
        dishH
    );

    noStroke();

    fill(
        255,
        232,
        190,
        40
    );

    ellipse(
        dishX -
            dishW * 0.08,
        dishY +
            dishH * 0.10,
        dishW * 0.56,
        dishH * 0.34
    );

    const itemOffsets =
        isDouble
            ? [
                -dishW * 0.21,
                dishW * 0.21,
            ]
            : [0];

    for (
        let index = 0;
        index < garnishes.length;
        index += 1
    ) {
        const garnish =
            garnishes[index];

        const isActive =
            garnish ===
            activeGarnish;

        const scaleValue =
            (
                garnish === "cherry"
                    ? 8.4
                    : 9.0
            ) *
            (
                isActive
                    ? pulse * 1.08
                    : 0.94
            );

        drawGarnishSymbol(
            garnish,
            dishX +
                itemOffsets[index],
            dishY +
                dishH * 0.37,
            scaleValue,
            isActive
                ? 245
                : 228,
            garnish === "cherry"
                ? -16
                : 10
        );
    }

    noStroke();
    rectMode(CORNER);
    ellipseMode(CENTER);
};





function traceInspectionBottleVectorPath(
    ctx,
    geometry,
    inset
) {
    const bodyHalf =
        Math.max(
            18,
            geometry.bodyWidth *
                0.5 -
                inset
        );

    const shoulderHalf =
        Math.max(
            bodyHalf,
            CONFIG.inspectionBottleShoulderWidth *
                0.5 -
                inset * 0.72
        );

    const neckHalf =
        Math.max(
            7,
            geometry.neckWidth *
                0.5 -
                inset * 0.42
        );

    const mouthHalf =
        Math.max(
            neckHalf + 2,
            geometry.mouthWidth *
                0.5 -
                inset * 0.28
        );

    const bottom =
        geometry.bodyBottom +
        inset;

    const bodyTop =
        geometry.bodyTop -
        inset * 0.18;

    const shoulderY =
        geometry.shoulderY -
        inset * 0.12;

    const neckBottom =
        geometry.neckBottom +
        inset * 0.20;

    const neckTop =
        geometry.neckTop -
        inset * 0.12;

    const cornerRadius =
        Math.max(
            7,
            18 -
            inset * 0.65
        );

    ctx.beginPath();

    ctx.moveTo(
        -mouthHalf,
        neckTop + 3
    );

    ctx.bezierCurveTo(
        -mouthHalf,
        neckTop + 7,
        -neckHalf,
        neckTop + 7,
        -neckHalf,
        neckTop
    );

    ctx.lineTo(
        -neckHalf,
        neckBottom
    );

    ctx.bezierCurveTo(
        -neckHalf,
        neckBottom - 9,
        -shoulderHalf,
        shoulderY + 12,
        -bodyHalf,
        bodyTop - 25
    );

    ctx.lineTo(
        -bodyHalf,
        bottom + cornerRadius
    );

    ctx.bezierCurveTo(
        -bodyHalf,
        bottom + 5,
        -bodyHalf + 6,
        bottom,
        -bodyHalf +
            cornerRadius,
        bottom
    );

    ctx.lineTo(
        bodyHalf -
            cornerRadius,
        bottom
    );

    ctx.bezierCurveTo(
        bodyHalf - 6,
        bottom,
        bodyHalf,
        bottom + 5,
        bodyHalf,
        bottom + cornerRadius
    );

    ctx.lineTo(
        bodyHalf,
        bodyTop - 25
    );

    ctx.bezierCurveTo(
        shoulderHalf,
        shoulderY + 12,
        neckHalf,
        neckBottom - 9,
        neckHalf,
        neckBottom
    );

    ctx.lineTo(
        neckHalf,
        neckTop
    );

    ctx.bezierCurveTo(
        neckHalf,
        neckTop + 7,
        mouthHalf,
        neckTop + 7,
        mouthHalf,
        neckTop + 3
    );

    ctx.lineTo(
        mouthHalf,
        neckTop + 7
    );

    ctx.bezierCurveTo(
        mouthHalf,
        neckTop + 11,
        -mouthHalf,
        neckTop + 11,
        -mouthHalf,
        neckTop + 7
    );

    ctx.closePath();
}

function drawInspectionBottleLiquidBand(
    ctx,
    geometry,
    ingredient,
    layerHeight,
    index
) {
    const bandWidth =
        geometry.bodyWidth +
        28;

    const halfHeight =
        layerHeight * 0.43;

    const token =
        gameState &&
        gameState.glass &&
        gameState.glass.slots
            ? gameState.glass.slots[index]
            : null;

    const motion =
        token &&
        token.liquidMotion
            ? token.liquidMotion
            : null;

    const fillProgress =
        motion &&
        motion.fillProgress !==
            undefined
            ? Math.max(
                0.001,
                Math.min(
                    1,
                    motion.fillProgress
                )
            )
            : 1;

    const alpha =
        motion &&
        motion.alpha !==
            undefined
            ? Math.max(
                0,
                Math.min(
                    1,
                    motion.alpha
                )
            )
            : 1;

    const waveBoost =
        motion &&
        motion.waveBoost !==
            undefined
            ? motion.waveBoost
            : 0;

    const surfaceLift =
        motion &&
        motion.surfaceLift !==
            undefined
            ? motion.surfaceLift
            : 0;

    const stretchX =
        motion &&
        motion.stretchX !==
            undefined
            ? motion.stretchX
            : 1;

    const baseWave =
        Math.sin(
            ElapsedTime * 2.4 +
            index * 1.7
        ) * 1.8;

    const activeWave =
        Math.sin(
            ElapsedTime * 10.0 +
            index * 2.3
        ) *
        2.2 *
        waveBoost;

    const wave =
        baseWave +
        activeWave;

    ctx.save();

    /*
     * 帯を下端から液体のように満たす。
     * しぼむ／こぼれる時も同じ処理で扱う。
     */
    ctx.translate(
        0,
        halfHeight - surfaceLift
    );

    ctx.scale(
        stretchX,
        fillProgress
    );

    ctx.translate(
        0,
        -halfHeight
    );

    ctx.beginPath();

    ctx.moveTo(
        -bandWidth,
        -halfHeight
    );

    ctx.bezierCurveTo(
        -bandWidth * 0.35,
        -halfHeight + wave,
        bandWidth * 0.35,
        -halfHeight - wave,
        bandWidth,
        -halfHeight
    );

    ctx.lineTo(
        bandWidth,
        halfHeight
    );

    ctx.bezierCurveTo(
        bandWidth * 0.35,
        halfHeight - wave * 0.45,
        -bandWidth * 0.35,
        halfHeight + wave * 0.45,
        -bandWidth,
        halfHeight
    );

    ctx.closePath();

    ctx.fillStyle =
        "rgba(" +
        String(
            ingredient.color.r
        ) +
        "," +
        String(
            ingredient.color.g
        ) +
        "," +
        String(
            ingredient.color.b
        ) +
        "," +
        String(
            0.84 * alpha
        ) +
        ")";

    ctx.fill();

    const highlight =
        ctx.createLinearGradient(
            -bandWidth,
            0,
            bandWidth,
            0
        );

    highlight.addColorStop(
        0,
        "rgba(255, 242, 213, " +
        String(
            0.02 * alpha
        ) +
        ")"
    );

    highlight.addColorStop(
        0.28,
        "rgba(255, 242, 213, " +
        String(
            0.17 * alpha
        ) +
        ")"
    );

    highlight.addColorStop(
        0.55,
        "rgba(255, 242, 213, " +
        String(
            0.04 * alpha
        ) +
        ")"
    );

    highlight.addColorStop(
        1,
        "rgba(20, 8, 4, " +
        String(
            0.16 * alpha
        ) +
        ")"
    );

    ctx.fillStyle =
        highlight;

    ctx.fill();

    ctx.beginPath();

    ctx.moveTo(
        -bandWidth,
        -halfHeight
    );

    ctx.bezierCurveTo(
        -bandWidth * 0.35,
        -halfHeight + wave,
        bandWidth * 0.35,
        -halfHeight - wave,
        bandWidth,
        -halfHeight
    );

    ctx.strokeStyle =
        "rgba(255, 231, 186, " +
        String(
            0.24 * alpha
        ) +
        ")";

    ctx.lineWidth = 1;

    ctx.stroke();

    ctx.restore();
}

function ensureTokenLiquidMotion(
    token
) {
    if (!token) {
        return null;
    }

    if (!token.liquidMotion) {
        token.liquidMotion = {
            alpha: 1,
            fillProgress: 1,
            waveBoost: 0,
            surfaceLift: 0,
            stretchX: 1,
        };
    }

    return token.liquidMotion;
}

function clearTokenLiquidMotion(
    token
) {
    if (!token) {
        return;
    }

    delete token.liquidMotion;
}

function resetTokenVisualTransform(
    token,
    y
) {
    if (!token) {
        return;
    }

    token.drawX = 0;
    token.drawY = y;
    token.rot = 0;
}

function settleTokensToCurrentSlots() {
    const slots =
        gameState.glass.slots;

    for (
        let index = 0;
        index < slots.length;
        index += 1
    ) {
        const token =
            slots[index];

        resetTokenVisualTransform(
            token,
            getGlassSlotLocalY(
                index
            )
        );

        clearTokenLiquidMotion(
            token
        );
    }
}




function drawInspectionBottleVectorHighlights(
    ctx,
    geometry
) {
    ctx.save();

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        0
    );

    ctx.strokeStyle =
        "rgba(233, 222, 199, 0.60)";

    ctx.lineWidth = 2.4;

    ctx.stroke();

    ctx.save();

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        3
    );

    ctx.clip();

    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";

    ctx.beginPath();

    ctx.moveTo(
        -geometry.bodyWidth *
            0.34,
        geometry.bodyBottom + 24
    );

    ctx.lineTo(
        -geometry.bodyWidth *
            0.31,
        geometry.bodyTop - 28
    );

    ctx.strokeStyle =
        "rgba(255, 247, 225, 0.20)";

    ctx.lineWidth = 3.8;

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        -geometry.bodyWidth *
            0.23,
        geometry.bodyBottom + 46
    );

    ctx.lineTo(
        -geometry.bodyWidth *
            0.22,
        geometry.bodyTop + 6
    );

    ctx.strokeStyle =
        "rgba(255, 247, 225, 0.10)";

    ctx.lineWidth = 1.8;

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        geometry.bodyWidth *
            0.24,
        geometry.bodyBottom + 18
    );

    ctx.lineTo(
        geometry.bodyWidth *
            0.21,
        geometry.bodyBottom + 58
    );

    ctx.strokeStyle =
        "rgba(255, 235, 202, 0.07)";

    ctx.lineWidth = 1.5;

    ctx.stroke();

    ctx.restore();

    const capWidth =
        geometry.mouthWidth + 4;

    const capBandHeight = 7;

    const capBandY =
        geometry.neckTop + 1;

    const capTopY =
        geometry.neckTop + 9;

    ctx.beginPath();

    ctx.rect(
        -capWidth * 0.44,
        capBandY,
        capWidth * 0.88,
        capBandHeight
    );

    ctx.fillStyle =
        "rgba(173, 114, 56, 0.96)";

    ctx.fill();

    ctx.strokeStyle =
        "rgba(244, 223, 185, 0.58)";

    ctx.lineWidth = 1.2;

    ctx.stroke();

    ctx.beginPath();

    ctx.ellipse(
        0,
        capTopY,
        capWidth * 0.42,
        geometry.mouthHeight * 0.24,
        0,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "rgba(196, 139, 73, 0.98)";

    ctx.fill();

    ctx.strokeStyle =
        "rgba(248, 230, 194, 0.52)";

    ctx.lineWidth = 1.0;

    ctx.stroke();

    for (
        let index = 0;
        index < 8;
        index += 1
    ) {
        const ratio =
            index / 7;

        const x =
            -capWidth * 0.32 +
            capWidth * 0.64 * ratio;

        ctx.beginPath();

        ctx.moveTo(
            x,
            capBandY + 1
        );

        ctx.lineTo(
            x,
            capBandY +
                capBandHeight - 1
        );

        ctx.strokeStyle =
            "rgba(110, 68, 34, 0.44)";

        ctx.lineWidth = 0.9;

        ctx.stroke();
    }

    ctx.restore();
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


function completeIngredientAddition(
    ingredientId
) {
    const ingredient =
        INGREDIENTS[
            ingredientId
        ];

    if (!ingredient) {
        gameState.flyingIngredient =
            null;

        gameState.phase =
            "WAIT_CAP_POWER";

        return;
    }

    gameState.landingPulse = 1;

    if (
        gameState.glass.slots.length >=
        CONFIG.glassCapacity
    ) {
        startCapacitySpillAndAdd(
            ingredientId
        );

        return;
    }

    gameState.flyingIngredient =
        null;

    addIngredientToken(
        ingredientId,
        false
    );
}


function startCapacitySpillAndAdd(ingredientId) {
    const ingredient =
        INGREDIENTS[
            ingredientId
        ];

    if (!ingredient) {
        gameState.flyingIngredient =
            null;

        gameState.capacitySpillFlow =
            null;

        gameState.ingredientFinishFlow =
            null;

        gameState.phase =
            "WAIT_CAP_POWER";

        return;
    }

    const slots =
        gameState.glass.slots;

    if (
        !slots ||
        slots.length <= 0
    ) {
        gameState.flyingIngredient =
            null;

        addIngredientToken(
            ingredientId,
            false
        );

        return;
    }

    if (
        !gameState.glass.spilledTokens
    ) {
        gameState.glass.spilledTokens =
            [];
    }

    const spilled =
        slots[0];

    if (!spilled) {
        gameState.flyingIngredient =
            null;

        addIngredientToken(
            ingredientId,
            false
        );

        return;
    }

    gameState.phase =
        "GLASS_FULL_WARNING";

    gameState.glassFullCount += 1;

    gameState.ingredientFinishFlow =
        null;

    const startDrawY =
        getGlassSlotLocalY(
            0
        );

    for (
        let index = 0;
        index < slots.length;
        index += 1
    ) {
        const token =
            slots[index];

        token.drawX = 0;
        token.drawY =
            getGlassSlotLocalY(
                index
            );

        token.rot = 0;
    }

    const glassCenterX =
        layout.glass.x +
        layout.glass.w * 0.5;

    const spillDirection =
        glassCenterX <
        WIDTH * 0.5
            ? -1
            : 1;

    const effect =
        gameState.glassFullEffect;

    effect.visible = true;
    effect.text = "";
    effect.x = 0;
    effect.y = 0;
    effect.scale = 0.84;
    effect.alpha = 0;
    effect.ring = 0;

    gameState.glassPulse.scale =
        1;

    const flying =
        gameState.flyingIngredient;

    gameState.capacitySpillFlow = {
        active: true,
        stage: "warning",
        elapsed: 0,
        ingredientId: ingredientId,
        spilled: spilled,
        spilledUid:
            spilled.uid,
        spilledStartY:
            startDrawY,
        survivorTokens:
            slots.slice(1),
        spillDirection:
            spillDirection,
        spillDistance:
            Math.min(
                CONFIG.capacitySpillDistance,
                layout.glass.w * 0.88
            ),
        visualProgress: 0,
        flyingStartY:
            flying
                ? flying.y
                : 0,
        flyingStartScale:
            flying
                ? flying.scale
                : 1,
        flyingStartRotation:
            flying
                ? flying.rotation
                : 0,
        incoming: null,
        targetY: 0,
        warningDuration:
            CONFIG.glassFullWarningDuration ||
            0.42,
        spillDuration:
            CONFIG.capacitySpillDuration ||
            0.34,
        settleDuration:
            CONFIG.capacityIncomingSettleDuration ||
            0.28,
    };
}


function updateCapacitySpillFlow() {
    const flow =
        gameState.capacitySpillFlow;

    if (
        !flow ||
        !flow.active
    ) {
        return;
    }

    const ingredient =
        INGREDIENTS[
            flow.ingredientId
        ];

    if (!ingredient) {
        gameState.capacitySpillFlow =
            null;
        gameState.flyingIngredient =
            null;
        settleTokensToCurrentSlots();
        gameState.phase =
            "WAIT_CAP_POWER";
        return;
    }

    if (
        !gameState.glass.spilledTokens
    ) {
        gameState.glass.spilledTokens =
            [];
    }

    flow.elapsed +=
        Math.max(
            0,
            DeltaTime
        );

    if (
        flow.stage ===
        "warning"
    ) {
        const duration =
            Math.max(
                0.01,
                flow.warningDuration
            );

        const rawT =
            Math.max(
                0,
                Math.min(
                    1,
                    flow.elapsed /
                        duration
                )
            );

        const t =
            1 -
            Math.pow(
                1 - rawT,
                2
            );

        gameState.phase =
            "GLASS_FULL_WARNING";

        const effect =
            gameState.glassFullEffect;

        effect.visible = true;
        effect.scale =
            0.84 +
            0.21 * t;
        effect.alpha =
            255 * t;
        effect.ring = t;

        gameState.glassPulse.scale =
            1 +
            0.05 *
                Math.sin(
                    rawT *
                    Math.PI
                );

        if (flow.spilled) {
            resetTokenVisualTransform(
                flow.spilled,
                flow.spilledStartY
            );

            const motion =
                ensureTokenLiquidMotion(
                    flow.spilled
                );

            motion.waveBoost =
                0.35 +
                rawT * 0.85;

            motion.stretchX =
                1 +
                rawT * 0.05;
        }

        for (
            let index = 0;
            index <
                flow.survivorTokens.length;
            index += 1
        ) {
            const token =
                flow.survivorTokens[
                    index
                ];

            resetTokenVisualTransform(
                token,
                getGlassSlotLocalY(
                    index + 1
                )
            );

            const motion =
                ensureTokenLiquidMotion(
                    token
                );

            motion.waveBoost =
                0.18 +
                rawT * 0.35;
            motion.stretchX =
                1 +
                rawT * 0.02;
        }

        if (
            rawT >= 1
        ) {
            flow.stage =
                "spilling";
            flow.elapsed = 0;
            gameState.phase =
                "CAPACITY_SPILLING";
        }

        return;
    }

    if (
        flow.stage ===
        "spilling"
    ) {
        const duration =
            Math.max(
                0.01,
                flow.spillDuration
            );

        const rawT =
            Math.max(
                0,
                Math.min(
                    1,
                    flow.elapsed /
                        duration
                )
            );

        const t =
            1 -
            Math.pow(
                1 - rawT,
                2
            );

        gameState.phase =
            "CAPACITY_SPILLING";

        const effect =
            gameState.glassFullEffect;

        effect.visible = true;
        effect.scale =
            1.05 -
            0.12 * t;
        effect.alpha =
            255 * (1 - t);
        effect.ring =
            1 + 0.65 * t;

        gameState.glassPulse.scale =
            1.05 -
            0.05 * t;

        const spilled =
            flow.spilled;

        if (spilled) {
            spilled.drawX =
                flow.spillDirection *
                22 * t;

            spilled.drawY =
                flow.spilledStartY +
                16 * t;

            spilled.rot =
                flow.spillDirection *
                8 * t;

            const motion =
                ensureTokenLiquidMotion(
                    spilled
                );

            motion.alpha =
                1 - t;
            motion.fillProgress =
                1 - 0.92 * t;
            motion.waveBoost =
                1.2 +
                0.8 * (1 - t);
            motion.surfaceLift =
                6 * t;
            motion.stretchX =
                1 +
                0.08 * t;
        }

        for (
            let index = 0;
            index <
                flow.survivorTokens.length;
            index += 1
        ) {
            const token =
                flow.survivorTokens[
                    index
                ];

            const startY =
                getGlassSlotLocalY(
                    index + 1
                );

            const targetY =
                getGlassSlotLocalY(
                    index
                );

            token.drawX =
                0;
            token.drawY =
                startY +
                (
                    targetY -
                    startY
                ) * t;
            token.rot = 0;

            const motion =
                ensureTokenLiquidMotion(
                    token
                );

            motion.waveBoost =
                0.55 *
                Math.sin(
                    rawT *
                    Math.PI
                );
            motion.stretchX =
                1 +
                0.03 *
                    Math.sin(
                        rawT *
                        Math.PI
                    );
        }

        if (
            rawT >= 1
        ) {
            if (spilled) {
                const currentIndex =
                    gameState.glass.slots.indexOf(
                        spilled
                    );

                if (
                    currentIndex >= 0
                ) {
                    gameState.glass.slots.splice(
                        currentIndex,
                        1
                    );
                }

                spilled.spillReason =
                    "capacity";

                clearTokenLiquidMotion(
                    spilled
                );
                delete spilled.drawX;
                delete spilled.drawY;
                delete spilled.rot;

                gameState.glass.spilledTokens.push(
                    spilled
                );
            }

            effect.visible = false;
            effect.alpha = 0;
            effect.ring = 0;

            gameState.capacitySpillFlow =
                null;

            settleTokensToCurrentSlots();
            gameState.flyingIngredient =
                null;
            gameState.glassPulse.scale =
                1;

            /*
             * あふれた後の新規追加は、
             * 既存の「下から満ちる」液体演出へつなぐ。
             */
            addIngredientToken(
                flow.ingredientId,
                false
            );
        }

        return;
    }

    gameState.capacitySpillFlow =
        null;
    gameState.flyingIngredient =
        null;
    settleTokensToCurrentSlots();
    gameState.phase =
        "WAIT_CAP_POWER";
}



function addIngredientToken(
    ingredientId,
    animateEntry
) {
    const ingredient =
        INGREDIENTS[
            ingredientId
        ];

    if (!ingredient) {
        gameState.flyingIngredient =
            null;

        gameState.phase =
            "WAIT_CAP_POWER";

        return;
    }

    const slots =
        gameState.glass.slots;

    if (
        slots.length >=
        CONFIG.glassCapacity
    ) {
        startCapacitySpillAndAdd(
            ingredientId
        );

        return;
    }

    const targetIndex =
        slots.length;

    const token = {
        uid:
            gameState.nextTokenUid,

        ingredientId:
            ingredientId,

        bandReveal: {
            progress: 0,
        },
    };

    gameState.nextTokenUid += 1;

    slots.push(
        token
    );

    gameState.flyingIngredient =
        null;

    gameState.bottleIngredientEntry =
        null;

    gameState.softIngredientSettle =
        false;

    gameState.phase =
        "ADDING_TOKEN";

    const settleToken =
        function() {
            delete token.bandReveal;

            gameState.skipIngredientFinishPulse =
                true;

            finishIngredientAddition();
        };

    if (
        typeof tween === "undefined" ||
        !tween ||
        !tween.easing
    ) {
        gameState.glassPulse.scale =
            1;

        settleToken();
        return;
    }

    /*
     * 液面の上昇と瓶のふくらみを同じ時間で進める。
     * 液面が満ちる瞬間に、瓶も最大まで反応する。
     */
    gameState.glassPulse.scale =
        0.996;

    tween(
        0.42,
        token.bandReveal,
        {
            progress: 1,
        },
        tween.easing.quadOut
    );

    tween(
        0.42,
        gameState.glassPulse,
        {
            scale: 1.026,
        },
        tween.easing.quadOut,
        function() {
            /*
             * 液面が最大まで達した直後、
             * 瓶も液体と一緒に静かに戻る。
             */
            tween(
                0.18,
                gameState.glassPulse,
                {
                    scale: 1,
                },
                tween.easing.quadInOut,
                settleToken
            );
        }
    );
}






function drawBottleIngredientEntry() {
    /*
     * 素材アイコンの追加演出は既存の瓶内描画に任せる。
     * 新しい素材色の帯だけが addIngredientToken() の
     * token.bandReveal に従って液体のように育つ。
     */
}





const drawBottleInspectionPanelBaseForIngredientEntry =
    drawBottleInspectionPanel;

drawBottleInspectionPanel = function() {
    drawBottleInspectionPanelBaseForIngredientEntry();
    drawBottleIngredientEntry();
};





function finishIngredientAddition() {
    gameState.capacitySpillFlow =
        null;

    gameState.ingredientFinishFlow =
        null;

    gameState.phase =
        "ADDING_TOKEN";

    const skipPulse =
        gameState.skipIngredientFinishPulse ===
        true;

    gameState.skipIngredientFinishPulse =
        false;

    const useSoftSettle =
        gameState.softIngredientSettle ===
        true;

    gameState.softIngredientSettle =
        false;

    if (
        typeof tween === "undefined" ||
        !tween ||
        !tween.easing
    ) {
        gameState.glassPulse.scale =
            1;

        resetGlassTokenTransforms();

        gameState.phase =
            "WAIT_CAP_POWER";

        return;
    }

    /*
     * bandReveal 側で瓶の反応まで完了済みの場合は、
     * 追加のバウンスを入れず、そのまま余韻だけ残す。
     */
    if (skipPulse) {
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
                gameState.glassPulse.scale =
                    1;

                resetGlassTokenTransforms();

                gameState.phase =
                    "WAIT_CAP_POWER";
            }
        );

        return;
    }

    if (useSoftSettle) {
        gameState.glassPulse.scale =
            0.985;

        tween(
            0.10,
            gameState.glassPulse,
            {
                scale: 1.028,
            },
            tween.easing.quadOut,
            function() {
                tween(
                    0.18,
                    gameState.glassPulse,
                    {
                        scale: 1,
                    },
                    tween.easing.quadInOut,
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
                                resetGlassTokenTransforms();

                                gameState.phase =
                                    "WAIT_CAP_POWER";
                            }
                        );
                    }
                );
            }
        );

        return;
    }

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
                            resetGlassTokenTransforms();

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

function applyBoardReadabilityConfig() {
    CONFIG.nodeSize = 20;
    CONFIG.currentNodeSize = 36;

    CONFIG.boardPathWidth = 5;
    CONFIG.boardPathBaseWidth = 9;

    CONFIG.boardPipeOuterWidth = 12;
    CONFIG.boardPipeBodyWidth = 8;
    CONFIG.boardPipeCollarLength = 9;
    CONFIG.boardPipeCollarExtra = 5;

    CONFIG.boardNodeIconSize = 18;
    CONFIG.boardNodeOutlineWidth = 2;

    CONFIG.boardSpecialNodeScale = 1.36;
    CONFIG.boardBranchNodeScale = 1.52;
    CONFIG.boardStartGoalScale = 1.44;
    CONFIG.boardReachableRingScale = 1.42;

    CONFIG.boardDistanceFontSize = 19;
    CONFIG.boardDistanceOffset = 29;

    CONFIG.boardValvePulseSpeed = 5.5;
    CONFIG.boardValveHandleAngle = 43;
    CONFIG.boardValveBoltSize = 3;

    CONFIG.boardStationPulseSpeed = 4.2;

    CONFIG.factoryMapWidthScale = 1.55;
    CONFIG.factoryMapHeightScale = 1.55;

    CONFIG.cameraPortraitLookAheadY = 12;
    CONFIG.cameraLandscapeLookAheadY = 28;

    CONFIG.boardBottleWidth = 21;
    CONFIG.boardBottleHeight = 35;
    CONFIG.boardBottleNeckWidth = 8;
    CONFIG.boardBottleNeckHeight = 9;
    CONFIG.boardBottleLabelWidth = 13;
    CONFIG.boardBottleLabelHeight = 10;

    CONFIG.boardBottleMouthWidth = 12;
    CONFIG.boardBottleMouthHeight = 5;
    CONFIG.boardBottleMouthInnerWidth = 7;
    CONFIG.boardBottleMouthInnerHeight = 2.5;

    CONFIG.boardBottleMoveLift = 7;
    CONFIG.boardBottleTilt = 5;
    CONFIG.boardBottleBaseRotation = 180;

    CONFIG.boardBottleRailOffset = -54;
    CONFIG.boardBottleScreenLift = 0;

    CONFIG.boardBottleDockMountY = -13;
    CONFIG.boardBottleDockStemTopY = -16;
    CONFIG.boardBottleDockStemBottomY = -20;
    CONFIG.boardBottleDockTipY = -22;

    CONFIG.ingredientNozzleSourceOffsetY = -7;
    CONFIG.ingredientNozzleRevealOffsetY = -11;
    CONFIG.ingredientNozzleHiddenOffsetY = 7;
    CONFIG.ingredientBottleMouthInsetY = 1;
    CONFIG.ingredientBottleRevealScale = 0.50;
    CONFIG.ingredientBottleArrivalScale = 0.10;
    CONFIG.ingredientBottleFlightDuration = 0.22;

    CONFIG.inspectionBottleBodyWidth = 92;
    CONFIG.inspectionBottleBodyHeight = 160;
    CONFIG.inspectionBottleShoulderWidth = 108;
    CONFIG.inspectionBottleShoulderHeight = 44;
    CONFIG.inspectionBottleNeckWidth = 34;
    CONFIG.inspectionBottleNeckHeight = 52;
    CONFIG.inspectionBottleMouthWidth = 43;
    CONFIG.inspectionBottleMouthHeight = 9;
    CONFIG.inspectionBottleInnerBottom = -96;
    CONFIG.inspectionBottleInnerTop = 38;

    CONFIG.coolingMaxLevel = 4;
    CONFIG.coolingRevealDuration = 0.44;
    CONFIG.coolingHoldDuration = 0.22;
    CONFIG.coolingFadeDuration = 0.30;
    CONFIG.coolingBoardRingSize = 62;
    CONFIG.coolingInspectionRingSize = 122;
    CONFIG.coolingMistDistance = 34;
    CONFIG.coolingMistCount = 9;

    CONFIG.goalCapDropDuration = 0.48;
    CONFIG.goalCapPressDuration = 0.15;
    CONFIG.goalCapReleaseDuration = 0.18;
    CONFIG.goalLabelDuration = 0.42;
    CONFIG.goalCompleteRevealDuration = 0.34;
    CONFIG.goalCompleteHoldDuration = 0.72;

    CONFIG.goalCapStartOffset = 58;
    CONFIG.goalCapSize = 25;
    CONFIG.goalPressHeadWidth = 32;
    CONFIG.goalPressHeadHeight = 10;
    CONFIG.goalPressStemLength = 35;

    CONFIG.goalLabelStartOffset = 54;
    CONFIG.goalLabelWidth = 18;
    CONFIG.goalLabelHeight = 12;

    CONFIG.stationActivationDuration = 0.38;
    CONFIG.stationActivationSettleDuration = 0.13;
    CONFIG.stationActivationRingSize = 48;
    CONFIG.stationActivationDropDistance = 28;
}


function applyFactoryLineBoardLayout() {
    const positions = {
        start: {
            nx: 0.12,
            ny: 0.08,
        },

        base_syrup: {
            nx: 0.30,
            ny: 0.08,
        },

        pour_carbon: {
            nx: 0.48,
            ny: 0.08,
        },

        ice1: {
            nx: 0.66,
            ny: 0.08,
        },

        vanilla1: {
            nx: 0.84,
            ny: 0.08,
        },

        stir1: {
            nx: 0.84,
            ny: 0.22,
        },

        syrup2: {
            nx: 0.66,
            ny: 0.22,
        },

        branch1: {
            nx: 0.48,
            ny: 0.22,
        },

        sweet_vanilla: {
            nx: 0.30,
            ny: 0.34,
        },

        sweet_caramel: {
            nx: 0.12,
            ny: 0.34,
        },

        sweet_stir: {
            nx: 0.12,
            ny: 0.48,
        },

        sweet_sugar: {
            nx: 0.30,
            ny: 0.48,
        },

        sweet_strong: {
            nx: 0.38,
            ny: 0.60,
        },

        spice_ginger: {
            nx: 0.66,
            ny: 0.34,
        },

        spice_cinnamon: {
            nx: 0.84,
            ny: 0.34,
        },

        spice_stir: {
            nx: 0.84,
            ny: 0.48,
        },

        spice_herb: {
            nx: 0.66,
            ny: 0.48,
        },

        spice_lemon: {
            nx: 0.58,
            ny: 0.60,
        },

        merge1: {
            nx: 0.48,
            ny: 0.68,
        },

        carb2: {
            nx: 0.30,
            ny: 0.80,
        },

        mystery: {
            nx: 0.12,
            ny: 0.80,
        },

        ice2: {
            nx: 0.12,
            ny: 0.94,
        },

        stir2: {
            nx: 0.30,
            ny: 0.94,
        },

        branch2: {
            nx: 0.48,
            ny: 0.94,
        },

        safe_lemon: {
            nx: 0.30,
            ny: 1.06,
        },

        safe_base_syrup: {
            nx: 0.12,
            ny: 1.06,
        },

        safe_cherry: {
            nx: 0.30,
            ny: 1.20,
        },

        risk_fizz: {
            nx: 0.66,
            ny: 1.06,
        },

        risk_stir: {
            nx: 0.84,
            ny: 1.06,
        },

        risk_mystery: {
            nx: 0.84,
            ny: 1.20,
        },

        risk_mix: {
            nx: 0.66,
            ny: 1.20,
        },

        goal: {
            nx: 0.48,
            ny: 1.34,
        },
    };

    for (
        const nodeId of
        Object.keys(positions)
    ) {
        const node =
            BOARD_NODES[nodeId];

        const position =
            positions[nodeId];

        if (
            !node ||
            !position
        ) {
            continue;
        }

        node.nx =
            position.nx;

        node.ny =
            position.ny;
    }
}


function getBoardNodeVisualScale(node) {
    if (!node) {
        return 1;
    }

    if (
        node.choices &&
        node.choices.length > 0
    ) {
        return CONFIG.boardBranchNodeScale;
    }

    if (
        node.id === "start" ||
        node.id === "goal"
    ) {
        return CONFIG.boardStartGoalScale;
    }

    if (
        node.nodeType === "event_gate" ||
        (
            node.effect &&
            (
                node.effect.addIngredient ||
                node.effect.addMystery ||
                node.effect.pressureDelta ||
                node.effect.garnish
            )
        )
    ) {
        return CONFIG.boardSpecialNodeScale;
    }

    return 1;
}


function drawBoardPipeSegment(
    point1,
    point2,
    branchPath
) {
    const dx =
        point2.x -
        point1.x;

    const dy =
        point2.y -
        point1.y;

    const length =
        Math.sqrt(
            dx * dx +
            dy * dy
        );

    if (length <= 0.01) {
        return;
    }

    const angle =
        Math.atan2(
            dy,
            dx
        ) *
        180 /
        Math.PI;

    const outerWidth =
        CONFIG.boardPipeOuterWidth;

    const bodyWidth =
        CONFIG.boardPipeBodyWidth;

    pushMatrix();

    translate(
        point1.x,
        point1.y
    );

    rotate(angle);

    stroke(
        12,
        9,
        8,
        190
    );

    strokeWidth(
        outerWidth + 5
    );

    line(
        0,
        -2,
        length,
        -2
    );

    stroke(
        67,
        49,
        39,
        255
    );

    strokeWidth(
        outerWidth
    );

    line(
        0,
        0,
        length,
        0
    );

    if (branchPath) {
        stroke(
            137,
            91,
            53,
            255
        );
    } else {
        stroke(
            126,
            96,
            72,
            255
        );
    }

    strokeWidth(
        bodyWidth
    );

    line(
        0,
        0,
        length,
        0
    );

    stroke(
        214,
        163,
        101,
        145
    );

    strokeWidth(
        Math.max(
            1,
            bodyWidth * 0.24
        )
    );

    line(
        0,
        -bodyWidth * 0.24,
        length,
        -bodyWidth * 0.24
    );

    stroke(
        50,
        34,
        28,
        150
    );

    strokeWidth(1);

    line(
        0,
        bodyWidth * 0.22,
        length,
        bodyWidth * 0.22
    );

    const collarX =
        length * 0.5;

    rectMode(CENTER);

    noStroke();

    fill(
        18,
        13,
        11,
        170
    );

    rect(
        collarX + 1,
        -2,
        CONFIG.boardPipeCollarLength + 4,
        outerWidth +
            CONFIG.boardPipeCollarExtra +
            4,
        3
    );

    fill(
        91,
        63,
        46,
        255
    );

    rect(
        collarX,
        0,
        CONFIG.boardPipeCollarLength +
            3,
        outerWidth +
            CONFIG.boardPipeCollarExtra,
        3
    );

    fill(
        157,
        108,
        66,
        255
    );

    rect(
        collarX,
        0,
        CONFIG.boardPipeCollarLength,
        outerWidth +
            CONFIG.boardPipeCollarExtra -
            3,
        2
    );

    noFill();

    stroke(
        220,
        170,
        105,
        150
    );

    strokeWidth(1);

    rect(
        collarX,
        0,
        CONFIG.boardPipeCollarLength,
        outerWidth +
            CONFIG.boardPipeCollarExtra -
            3,
        2
    );

    noStroke();

    fill(
        229,
        182,
        112,
        210
    );

    ellipse(
        collarX,
        -outerWidth * 0.42,
        3
    );

    ellipse(
        collarX,
        outerWidth * 0.42,
        3
    );

    rectMode(CORNER);

    popMatrix();

    noStroke();
}

function getBranchValveChoiceIndex(node) {
    if (
        !node ||
        !node.choices ||
        node.choices.length < 2
    ) {
        return -1;
    }

    const selectedRouteId =
        gameState.selectedRoutes[
            node.id
        ];

    if (!selectedRouteId) {
        return -1;
    }

    for (
        let index = 0;
        index < node.choices.length;
        index += 1
    ) {
        if (
            node.choices[index].id ===
            selectedRouteId
        ) {
            return index;
        }
    }

    return -1;
}

function drawBranchValveNode(
    node,
    x,
    y,
    size,
    alpha,
    active
) {
    const selectedIndex =
        getBranchValveChoiceIndex(
            node
        );

    const unresolved =
        selectedIndex < 0;

    const pulse =
        active &&
        unresolved
            ? 1 +
                Math.sin(
                    ElapsedTime *
                        CONFIG.boardValvePulseSpeed
                ) *
                    0.07
            : 1;

    const bodySize =
        size * pulse;

    if (
        active &&
        unresolved
    ) {
        noFill();

        stroke(
            255,
            205,
            115,
            alpha * 0.32
        );

        strokeWidth(2);

        ellipse(
            x,
            y,
            bodySize * 1.55
        );

        noStroke();
    }

    fill(
        12,
        9,
        8,
        alpha * 0.55
    );

    ellipse(
        x + 2,
        y - 2,
        bodySize + 8
    );

    fill(
        69,
        46,
        34,
        alpha
    );

    ellipse(
        x,
        y,
        bodySize
    );

    fill(
        151,
        101,
        59,
        alpha
    );

    ellipse(
        x,
        y,
        bodySize * 0.77
    );

    fill(
        82,
        54,
        39,
        alpha
    );

    ellipse(
        x,
        y,
        bodySize * 0.49
    );

    noFill();

    stroke(
        234,
        181,
        108,
        alpha * 0.72
    );

    strokeWidth(1.5);

    ellipse(
        x,
        y,
        bodySize * 0.78
    );

    stroke(
        38,
        25,
        20,
        alpha * 0.75
    );

    strokeWidth(2);

    ellipse(
        x,
        y,
        bodySize
    );

    noStroke();

    for (
        let index = 0;
        index < 4;
        index += 1
    ) {
        const angle =
            (
                45 +
                index * 90
            ) *
            Math.PI /
            180;

        const boltRadius =
            bodySize * 0.34;

        const boltX =
            x +
            Math.cos(angle) *
                boltRadius;

        const boltY =
            y +
            Math.sin(angle) *
                boltRadius;

        fill(
            235,
            190,
            119,
            alpha * 0.88
        );

        ellipse(
            boltX,
            boltY,
            CONFIG.boardValveBoltSize
        );
    }

    let handleAngle = 0;

    if (selectedIndex === 0) {
        handleAngle =
            CONFIG.boardValveHandleAngle;
    } else if (
        selectedIndex === 1
    ) {
        handleAngle =
            -CONFIG.boardValveHandleAngle;
    }

    pushMatrix();

    translate(
        x,
        y
    );

    rotate(
        handleAngle
    );

    stroke(
        37,
        23,
        18,
        alpha
    );

    strokeWidth(
        Math.max(
            6,
            bodySize * 0.19
        )
    );

    line(
        0,
        0,
        0,
        bodySize * 0.40
    );

    stroke(
        selectedIndex >= 0
            ? 246
            : 194,
        selectedIndex >= 0
            ? 178
            : 132,
        selectedIndex >= 0
            ? 78
            : 76,
        alpha
    );

    strokeWidth(
        Math.max(
            3,
            bodySize * 0.10
        )
    );

    line(
        0,
        0,
        0,
        bodySize * 0.40
    );

    noStroke();

    rectMode(CENTER);

    fill(
        42,
        27,
        21,
        alpha
    );

    rect(
        0,
        bodySize * 0.42,
        bodySize * 0.54,
        bodySize * 0.17,
        3
    );

    fill(
        selectedIndex >= 0
            ? 225
            : 150,
        selectedIndex >= 0
            ? 145
            : 95,
        selectedIndex >= 0
            ? 57
            : 58,
        alpha
    );

    rect(
        0,
        bodySize * 0.44,
        bodySize * 0.48,
        bodySize * 0.12,
        2
    );

    rectMode(CORNER);

    popMatrix();

    fill(
        224,
        166,
        91,
        alpha
    );

    ellipse(
        x,
        y,
        bodySize * 0.18
    );

    noStroke();
}


function getBoardStationType(node) {
    if (!node) {
        return null;
    }

    if (node.id === "start") {
        return "bottle";
    }

    if (node.id === "goal") {
        return "serve";
    }

    if (
        node.effect &&
        node.effect.addMystery
    ) {
        return "mystery";
    }

    if (
        node.nodeType ===
        "event_gate"
    ) {
        return "shake";
    }

    if (
        node.effect &&
        node.effect.garnish
    ) {
        return "garnish";
    }

    if (
        node.effect &&
        node.effect.pressureDelta
    ) {
        return "carbonation";
    }

    if (
        node.effect &&
        node.effect.addIngredient
    ) {
        const ingredientId =
            node.effect.addIngredient;

        if (
            ingredientId === "ice"
        ) {
            return "cooling";
        }

        if (
            ingredientId === "ginger" ||
            ingredientId === "cinnamon" ||
            ingredientId === "lemon_peel" ||
            ingredientId === "herb"
        ) {
            return "spice";
        }

        return "syrup";
    }

    return null;
}



function drawBoardStationBase(
    alpha,
    active
) {
    const pulse =
        active
            ? 1 +
                Math.sin(
                    ElapsedTime *
                        CONFIG.boardStationPulseSpeed
                ) *
                    0.04
            : 1;

    scale(
        pulse,
        pulse
    );

    fill(
        14,
        10,
        9,
        alpha * 0.55
    );

    rectMode(CENTER);

    rect(
        1,
        -1,
        26,
        20,
        5
    );

    fill(
        73,
        49,
        37,
        alpha
    );

    rect(
        0,
        0,
        24,
        18,
        4
    );

    fill(
        122,
        82,
        52,
        alpha
    );

    rect(
        0,
        1,
        20,
        13,
        3
    );

    noFill();

    stroke(
        226,
        177,
        106,
        alpha * 0.55
    );

    strokeWidth(1);

    rect(
        0,
        0,
        24,
        18,
        4
    );

    noStroke();

    fill(
        224,
        178,
        108,
        alpha * 0.85
    );

    ellipse(
        -9,
        -6,
        2.4
    );

    ellipse(
        9,
        -6,
        2.4
    );

    ellipse(
        -9,
        6,
        2.4
    );

    ellipse(
        9,
        6,
        2.4
    );

    rectMode(CORNER);
}

function drawBoardStationIcon(
    node,
    x,
    y,
    size,
    alpha
) {
    const stationType =
        getBoardStationType(
            node
        );

    if (!stationType) {
        return false;
    }

    const active =
        gameState.currentNodeId ===
        node.id;

    pushMatrix();

    translate(
        x,
        y
    );

    scale(
        size / 24,
        size / 24
    );

    drawBoardStationBase(
        alpha,
        active
    );

    if (
        stationType === "bottle"
    ) {
        drawStartBoardNodeIcon(
            alpha,
            active
        );
    } else if (
        stationType === "serve"
    ) {
        drawGoalBoardNodeIcon(
            alpha,
            active
        );
    } else if (
        stationType === "syrup"
    ) {
        const ingredient =
            INGREDIENTS[
                node.effect.addIngredient
            ];

        fill(
            35,
            23,
            18,
            alpha
        );

        rectMode(CENTER);

        rect(
            0,
            -6,
            8,
            4,
            1
        );

        fill(
            ingredient.color.r,
            ingredient.color.g,
            ingredient.color.b,
            alpha * 0.92
        );

        rect(
            0,
            1,
            13,
            12,
            3
        );

        fill(
            246,
            210,
            150,
            alpha * 0.52
        );

        rect(
            -4,
            0,
            2,
            8,
            1
        );

        stroke(
            237,
            195,
            126,
            alpha * 0.78
        );

        strokeWidth(1.2);

        noFill();

        rect(
            0,
            1,
            13,
            12,
            3
        );

        noStroke();

        fill(
            225,
            172,
            92,
            alpha
        );

        rect(
            7,
            -3,
            6,
            2,
            1
        );

        ellipse(
            10,
            0,
            3
        );

        rectMode(CORNER);
    } else if (
        stationType === "ice"
    ) {
        fill(
            38,
            52,
            59,
            alpha
        );

        rectMode(CENTER);

        rect(
            0,
            2,
            18,
            11,
            3
        );

        fill(
            190,
            232,
            246,
            alpha * 0.90
        );

        rect(
            -5,
            0,
            6,
            6,
            1
        );

        rect(
            2,
            2,
            6,
            6,
            1
        );

        rect(
            5,
            -3,
            5,
            5,
            1
        );

        noFill();

        stroke(
            231,
            249,
            255,
            alpha * 0.72
        );

        strokeWidth(1);

        rect(
            0,
            2,
            18,
            11,
            3
        );

        noStroke();
        rectMode(CORNER);
    } else if (
        stationType === "spice"
    ) {
        const ingredient =
            INGREDIENTS[
                node.effect.addIngredient
            ];

        fill(
            50,
            32,
            24,
            alpha
        );

        rectMode(CENTER);

        rect(
            0,
            -6,
            14,
            4,
            1
        );

        fill(
            ingredient.color.r,
            ingredient.color.g,
            ingredient.color.b,
            alpha * 0.90
        );

        rect(
            0,
            1,
            15,
            11,
            3
        );

        fill(
            250,
            223,
            177,
            alpha * 0.72
        );

        ellipse(
            -4,
            0,
            2.4
        );

        ellipse(
            1,
            -1,
            2.4
        );

        ellipse(
            4,
            3,
            2.4
        );

        noFill();

        stroke(
            228,
            185,
            121,
            alpha * 0.75
        );

        strokeWidth(1);

        rect(
            0,
            1,
            15,
            11,
            3
        );

        noStroke();
        rectMode(CORNER);
    } else if (
        stationType === "carbonation"
    ) {
        fill(
            49,
            39,
            34,
            alpha
        );

        rectMode(CENTER);

        rect(
            0,
            -5,
            15,
            6,
            2
        );

        fill(
            177,
            126,
            73,
            alpha
        );

        rect(
            0,
            -2,
            5,
            10,
            2
        );

        fill(
            214,
            169,
            103,
            alpha
        );

        rect(
            4,
            1,
            8,
            3,
            1
        );

        fill(
            190,
            233,
            247,
            alpha * 0.90
        );

        ellipse(
            -4,
            4,
            3
        );

        ellipse(
            0,
            7,
            4
        );

        ellipse(
            5,
            5,
            2.5
        );

        noFill();

        stroke(
            231,
            249,
            255,
            alpha * 0.65
        );

        strokeWidth(1);

        ellipse(
            -4,
            4,
            3
        );

        ellipse(
            0,
            7,
            4
        );

        ellipse(
            5,
            5,
            2.5
        );

        noStroke();
        rectMode(CORNER);
    } else if (
        stationType === "stir"
    ) {
        fill(
            44,
            28,
            22,
            alpha
        );

        ellipse(
            0,
            2,
            17
        );

        fill(
            126,
            66,
            30,
            alpha
        );

        ellipse(
            0,
            2,
            13
        );

        noFill();

        stroke(
            226,
            174,
            104,
            alpha * 0.82
        );

        strokeWidth(1.4);

        ellipse(
            0,
            2,
            17
        );

        stroke(
            236,
            206,
            154,
            alpha
        );

        strokeWidth(2);

        line(
            4,
            -8,
            -2,
            5
        );

        stroke(
            255,
            226,
            170,
            alpha * 0.62
        );

        strokeWidth(1.2);

        line(
            -5,
            2,
            4,
            2
        );

        noStroke();
    } else if (
        stationType === "mystery"
    ) {
        fill(
            41,
            25,
            45,
            alpha
        );

        rectMode(CENTER);

        rect(
            0,
            1,
            16,
            14,
            4
        );

        fill(
            113,
            67,
            122,
            alpha
        );

        rect(
            0,
            -6,
            12,
            4,
            1
        );

        noFill();

        stroke(
            212,
            164,
            221,
            alpha * 0.75
        );

        strokeWidth(1.2);

        rect(
            0,
            1,
            16,
            14,
            4
        );

        noStroke();

        fill(
            241,
            210,
            245,
            alpha
        );

        fontSize(12);

        textAlign(CENTER);

        text(
            "?",
            0,
            2
        );

        rectMode(CORNER);
    } else if (
        stationType === "garnish"
    ) {
        fill(
            48,
            34,
            27,
            alpha
        );

        rectMode(CENTER);

        rect(
            0,
            3,
            19,
            9,
            3
        );

        fill(
            130,
            88,
            53,
            alpha
        );

        rect(
            0,
            1,
            17,
            4,
            2
        );

        if (
            node.effect.garnish ===
            "cherry"
        ) {
            fill(
                212,
                63,
                60,
                alpha
            );

            ellipse(
                1,
                -1,
                8
            );

            stroke(
                93,
                132,
                67,
                alpha
            );

            strokeWidth(1.5);

            line(
                2,
                -5,
                6,
                -9
            );

            noStroke();
        } else {
            fill(
                224,
                218,
                74,
                alpha
            );

            ellipse(
                0,
                -1,
                10
            );

            fill(
                78,
                119,
                62,
                alpha
            );

            ellipse(
                0,
                -1,
                5
            );

            stroke(
                247,
                239,
                147,
                alpha * 0.82
            );

            strokeWidth(1);

            line(
                0,
                -6,
                0,
                4
            );

            noStroke();
        }

        rectMode(CORNER);
    }

    popMatrix();

    noStroke();

    return true;
}

function drawStartBoardNodeIcon(
    alpha,
    active
) {
    const pulse =
        active
            ? 1 +
                Math.sin(
                    ElapsedTime *
                        CONFIG.boardStationPulseSpeed
                ) *
                    0.05
            : 1;

    noFill();

    stroke(
        244,
        198,
        121,
        alpha * 0.62
    );

    strokeWidth(1.1);

    ellipse(
        0,
        1,
        19 * pulse,
        19 * pulse
    );

    noStroke();

    rectMode(CENTER);

    fill(
        47,
        29,
        22,
        alpha
    );

    rect(
        0,
        -7,
        12,
        3,
        1
    );

    fill(
        220,
        176,
        104,
        alpha
    );

    rect(
        0,
        -7,
        8,
        2,
        1
    );

    fill(
        87,
        58,
        39,
        alpha
    );

    rect(
        0,
        -3.5,
        3,
        4,
        1
    );

    fill(
        224,
        166,
        91,
        alpha * 0.92
    );

    ellipse(
        0,
        -0.5,
        2.2,
        3.6
    );

    fill(
        133,
        86,
        48,
        alpha
    );

    rect(
        0,
        4,
        10,
        10,
        3
    );

    fill(
        244,
        214,
        167,
        alpha * 0.52
    );

    rect(
        -3,
        4,
        1.8,
        6.5,
        1
    );

    noFill();

    stroke(
        247,
        216,
        164,
        alpha * 0.78
    );

    strokeWidth(1.1);

    rect(
        0,
        4,
        10,
        10,
        3
    );

    stroke(
        88,
        55,
        34,
        alpha * 0.72
    );

    strokeWidth(1);

    line(
        -7,
        9,
        -2,
        9
    );

    line(
        2,
        9,
        7,
        9
    );

    noStroke();

    rectMode(CORNER);
}

function drawGoalBoardNodeIcon(
    alpha,
    active
) {
    const pulse =
        active
            ? 1 +
                Math.sin(
                    ElapsedTime *
                        CONFIG.boardStationPulseSpeed
                ) *
                    0.05
            : 1;

    noFill();

    stroke(
        246,
        205,
        126,
        alpha * 0.68
    );

    strokeWidth(1.2);

    ellipse(
        0,
        2,
        20 * pulse
    );

    noStroke();

    rectMode(CENTER);

    fill(
        38,
        27,
        22,
        alpha
    );

    rect(
        0,
        7,
        18,
        5,
        2
    );

    fill(
        222,
        157,
        75,
        alpha
    );

    rect(
        0,
        5.5,
        14,
        3,
        1
    );

    fill(
        30,
        20,
        17,
        alpha
    );

    rect(
        0,
        -4.5,
        4,
        4,
        1
    );

    fill(
        134,
        78,
        39,
        alpha
    );

    rect(
        0,
        0.5,
        8,
        10,
        3
    );

    fill(
        241,
        208,
        154,
        alpha * 0.55
    );

    rect(
        -2,
        0,
        1.6,
        6.8,
        1
    );

    noFill();

    stroke(
        248,
        221,
        173,
        alpha * 0.78
    );

    strokeWidth(1.1);

    rect(
        0,
        0.5,
        8,
        10,
        3
    );

    stroke(
        232,
        188,
        113,
        alpha * 0.82
    );

    strokeWidth(1.1);

    line(
        4.2,
        -4.2,
        7.0,
        -6.0
    );

    line(
        7.0,
        -6.0,
        9.6,
        -4.2
    );

    line(
        5.1,
        -2.8,
        8.8,
        -2.8
    );

    noStroke();

    fill(
        235,
        186,
        109,
        alpha
    );

    ellipse(
        7,
        -0.8,
        2.2
    );

    rectMode(CORNER);
}


function drawBoardBottleToken(
    x,
    y,
    scaleValue,
    rotationValue,
    alpha
) {
    const width =
        CONFIG.boardBottleWidth;

    const height =
        CONFIG.boardBottleHeight;

    const neckWidth =
        CONFIG.boardBottleNeckWidth;

    const neckHeight =
        CONFIG.boardBottleNeckHeight;

    const mouthWidth =
        CONFIG.boardBottleMouthWidth;

    const mouthHeight =
        CONFIG.boardBottleMouthHeight;

    const mouthInnerWidth =
        CONFIG.boardBottleMouthInnerWidth;

    const mouthInnerHeight =
        CONFIG.boardBottleMouthInnerHeight;

    const slotCount =
        gameState.glass &&
        gameState.glass.slots
            ? gameState.glass.slots.length
            : 0;

    const ingredientRatio =
        Math.max(
            0,
            Math.min(
                1,
                slotCount /
                    CONFIG.glassCapacity
            )
        );

    const pressure =
        gameState.glass
            ? gameState.glass.pressure
            : 0;

    const pressureRatio =
        Math.max(
            0,
            Math.min(
                1,
                pressure /
                    CONFIG.pressureMax
            )
        );

    const liquidRatio =
        0.16 +
        ingredientRatio * 0.72;

    const liquidHeight =
        Math.max(
            4,
            (
                height -
                8
            ) *
                liquidRatio
        );

    const liquidR =
        Math.round(
            154 -
            ingredientRatio * 66
        );

    const liquidG =
        Math.round(
            78 -
            ingredientRatio * 39
        );

    const liquidB =
        Math.round(
            25 -
            ingredientRatio * 10
        );

    const docked =
        !gameState.targetNodeId;

    const screenLift =
        CONFIG.boardBottleScreenLift || 0;

    const shakeActive =
        typeof isEventActionPhase ===
            "function" &&
        isEventActionPhase();

    const shakeOffsetX =
        shakeActive
            ? Math.sin(
                ElapsedTime * 42
            ) * 4
            : 0;

    const shakeRotation =
        shakeActive
            ? Math.sin(
                ElapsedTime * 39
            ) * 6
            : 0;

    if (docked) {
        drawBoardBottleDock(
            x,
            y,
            alpha
        );
    }

    pushMatrix();

    translate(
        x +
            shakeOffsetX,
        y +
            CONFIG.boardBottleRailOffset -
            screenLift
    );

    rotate(
        CONFIG.boardBottleBaseRotation +
            rotationValue +
            shakeRotation
    );

    scale(
        scaleValue,
        scaleValue
    );

    noStroke();

    fill(
        8,
        6,
        5,
        alpha * 0.34
    );

    ellipse(
        3,
        height * 0.48,
        width * 1.55,
        8
    );

    rectMode(CENTER);

    fill(
        18,
        11,
        8,
        alpha * 0.92
    );

    rect(
        2,
        1,
        width + 5,
        height + 4,
        7
    );

    rect(
        2,
        -height * 0.54,
        neckWidth + 4,
        neckHeight + 4,
        3
    );

    fill(
        91,
        51,
        24,
        alpha * 0.92
    );

    rect(
        0,
        0,
        width,
        height,
        6
    );

    fill(
        105,
        61,
        30,
        alpha
    );

    rect(
        0,
        -height * 0.54,
        neckWidth,
        neckHeight,
        2
    );

    fill(
        liquidR,
        liquidG,
        liquidB,
        alpha * 0.94
    );

    rect(
        0,
        height * 0.5 -
            liquidHeight * 0.5 -
            3,
        width - 6,
        liquidHeight,
        4
    );

    fill(
        218,
        151,
        71,
        alpha * 0.42
    );

    rect(
        -width * 0.29,
        -2,
        3,
        height - 10,
        2
    );

    noFill();

    stroke(
        242,
        201,
        132,
        alpha * 0.72
    );

    strokeWidth(1.4);

    rect(
        0,
        0,
        width,
        height,
        6
    );

    rect(
        0,
        -height * 0.54,
        neckWidth,
        neckHeight,
        2
    );

    noStroke();

    const mouthY =
        -height * 0.765;

    const collarY =
        -height * 0.655;

    fill(
        34,
        20,
        14,
        alpha * 0.90
    );

    rect(
        0,
        collarY + 0.4,
        neckWidth + 3.6,
        4.2,
        1.7
    );

    fill(
        132,
        84,
        42,
        alpha
    );

    rect(
        0,
        collarY,
        neckWidth + 2.2,
        3.2,
        1.5
    );

    fill(
        221,
        170,
        95,
        alpha * 0.36
    );

    rect(
        0,
        collarY - 0.3,
        neckWidth - 1.4,
        0.9,
        0.6
    );

    fill(
        45,
        25,
        17,
        alpha
    );

    ellipse(
        0,
        mouthY,
        mouthWidth - 0.6,
        mouthHeight + 0.9
    );

    fill(
        159,
        98,
        48,
        alpha
    );

    ellipse(
        0,
        mouthY + 0.1,
        mouthWidth - 2.4,
        mouthHeight + 0.1
    );

    fill(
        25,
        16,
        11,
        alpha
    );

    ellipse(
        0,
        mouthY + 0.15,
        mouthInnerWidth - 0.4,
        mouthInnerHeight + 0.25
    );

    noFill();

    stroke(
        244,
        193,
        112,
        alpha * 0.82
    );

    strokeWidth(1);

    ellipse(
        0,
        mouthY,
        mouthWidth - 0.5,
        mouthHeight + 0.8
    );

    noStroke();

    fill(
        255,
        230,
        175,
        alpha * 0.34
    );

    ellipse(
        -2.1,
        mouthY - 0.15,
        2.3,
        0.75
    );

    if (pressure > 0) {
        const bubbleCount =
            Math.min(
                5,
                Math.max(
                    1,
                    pressure
                )
            );

        const bubblePositions = [
            {
                x: -5,
                y: 10,
                s: 2.8,
            },
            {
                x: 4,
                y: 7,
                s: 2.2,
            },
            {
                x: -1,
                y: 13,
                s: 2.4,
            },
            {
                x: 6,
                y: 12,
                s: 1.8,
            },
            {
                x: -6,
                y: 4,
                s: 1.9,
            },
        ];

        noFill();

        stroke(
            226,
            244,
            248,
            alpha *
                (
                    0.42 +
                    pressureRatio *
                        0.32
                )
        );

        strokeWidth(1);

        for (
            let index = 0;
            index < bubbleCount;
            index += 1
        ) {
            const bubble =
                bubblePositions[
                    index
                ];

            ellipse(
                bubble.x,
                bubble.y,
                bubble.s
            );
        }

        noStroke();
    }

    rectMode(CORNER);

    popMatrix();

    noStroke();
}



function drawBoardBottleDock(
    x,
    y,
    alpha
) {
    pushMatrix();

    translate(
        x,
        y
    );

    rectMode(CENTER);

    fill(
        10,
        7,
        6,
        alpha * 0.52
    );

    rect(
        2,
        CONFIG.boardBottleDockMountY - 2,
        21,
        11,
        4
    );

    fill(
        72,
        48,
        35,
        alpha
    );

    rect(
        0,
        CONFIG.boardBottleDockMountY,
        19,
        9,
        4
    );

    fill(
        143,
        94,
        53,
        alpha
    );

    rect(
        0,
        CONFIG.boardBottleDockMountY,
        15,
        6,
        3
    );

    noFill();

    stroke(
        230,
        179,
        105,
        alpha * 0.68
    );

    strokeWidth(1);

    rect(
        0,
        CONFIG.boardBottleDockMountY,
        19,
        9,
        4
    );

    noStroke();

    fill(
        230,
        181,
        107,
        alpha * 0.82
    );

    ellipse(
        -6,
        CONFIG.boardBottleDockMountY,
        2.5
    );

    ellipse(
        6,
        CONFIG.boardBottleDockMountY,
        2.5
    );

    stroke(
        31,
        20,
        16,
        alpha
    );

    strokeWidth(8);

    line(
        0,
        CONFIG.boardBottleDockStemTopY,
        0,
        CONFIG.boardBottleDockStemBottomY
    );

    stroke(
        169,
        112,
        61,
        alpha
    );

    strokeWidth(5);

    line(
        0,
        CONFIG.boardBottleDockStemTopY,
        0,
        CONFIG.boardBottleDockStemBottomY
    );

    stroke(
        237,
        191,
        118,
        alpha * 0.72
    );

    strokeWidth(1.5);

    line(
        -1.5,
        CONFIG.boardBottleDockStemTopY,
        -1.5,
        CONFIG.boardBottleDockStemBottomY
    );

    noStroke();

    fill(
        45,
        29,
        22,
        alpha
    );

    rect(
        0,
        CONFIG.boardBottleDockTipY,
        14,
        6,
        2
    );

    fill(
        181,
        119,
        64,
        alpha
    );

    rect(
        0,
        CONFIG.boardBottleDockTipY,
        11,
        4,
        2
    );

    fill(
        242,
        194,
        119,
        alpha * 0.72
    );

    rect(
        0,
        CONFIG.boardBottleDockTipY + 1,
        7,
        1.5,
        1
    );

    rectMode(CORNER);

    popMatrix();

    noStroke();
}


function initCapPowerConfig() {
    CONFIG.capGaugeSpeed = 1.65;
    CONFIG.capPowerZone1End = 0.28;
    CONFIG.capPowerZone2End = 0.62;
    CONFIG.capPowerZone3End = 0.90;
    CONFIG.capOverStart = 0.90;

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


    CONFIG.pressureMin = 0;
    CONFIG.burstResetPressure = 3;
    CONFIG.pressureChangeDuration = 0.42;
    CONFIG.pressureBubbleCount = 14;
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
        chillCount: 0,

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

        stationAnimation: {
            visible: false,
            nodeId: null,
            stationType: null,
            progress: 0,
            pulse: 0,
            rotation: 0,
            alpha: 0,
        },

        coolingEffect: {
            visible: false,
            nodeId: null,
            progress: 0,
            pulse: 0,
            alpha: 0,
        },

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
            stage: "idle",
            scale: 1,
            alpha: 0,
            ring: 0,
            capProgress: 0,
            capRotation: -35,
            press: 0,
            labelProgress: 0,
            complete: 0,
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

    const portrait =
        HEIGHT > WIDTH;

    if (portrait) {
        const margin = 12;

        const lowerH =
            HEIGHT * 0.38;

        const capW =
            (
                WIDTH -
                margin * 3
            ) *
            0.60;

        const glassW =
            WIDTH -
            capW -
            margin * 3;

        layout = {
            board: {
                x: margin,
                y:
                    lowerH +
                    margin * 2,
                w:
                    WIDTH -
                    margin * 2,
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
                y:
                    HEIGHT * 0.35 +
                    10,
                w:
                    WIDTH * 0.60,
                h:
                    HEIGHT * 0.65 -
                    30,
            },

            cap: {
                x: 20,
                y: 20,
                w:
                    WIDTH * 0.60,
                h:
                    HEIGHT * 0.35 -
                    20,
            },

            glass: {
                x:
                    WIDTH * 0.60 +
                    40,
                y: 20,
                w:
                    WIDTH * 0.40 -
                    60,
                h:
                    HEIGHT -
                    40,
            },
        };
    }

    CONFIG.mapWidth =
        WIDTH *
        (
            portrait
                ? CONFIG.factoryMapWidthScale
                : 1.30
        );

    CONFIG.mapHeight =
        HEIGHT *
        (
            portrait
                ? CONFIG.factoryMapHeightScale
                : 1.65
        );

    CONFIG.cameraLookAheadY =
        portrait
            ? CONFIG.cameraPortraitLookAheadY
            : CONFIG.cameraLandscapeLookAheadY;

    const currentNode =
        BOARD_NODES[
            gameState.currentNodeId
        ];

    if (!currentNode) {
        return;
    }

    gameState.camera.x =
        currentNode.nx *
        CONFIG.mapWidth;

    gameState.camera.y =
        currentNode.ny *
            CONFIG.mapHeight +
        CONFIG.cameraLookAheadY;

    gameState.camera.zoom =
        portrait
            ? 0.96
            : 1.02;
}


function drawTitle() {
    setGameUIFont();
    drawLanguageButton();

    const cx =
        WIDTH * 0.5;

    const isJa =
        gameState.language === "ja";

    const topTitle =
        isJa
            ? "コーラすごろく"
            : "COLA ROLL";

    const secondTitle =
        isJa
            ? "COLA ROLL"
            : "Craft Cola Board Game";

    const startText =
        isJa
            ? "画面をタップしてスタート"
            : "Tap anywhere to start";

    const topTitleY =
        HEIGHT * 0.68;

    const secondTitleY =
        HEIGHT * 0.56;

    const startY =
        HEIGHT * 0.41;

    setGameTitleFont();

    noStroke();

    fill(
        245,
        238,
        228
    );

    fontSize(
        Math.min(
            50,
            WIDTH * 0.108
        )
    );

    textAlign(CENTER);

    text(
        topTitle,
        cx,
        topTitleY
    );

    fill(
        245,
        238,
        228,
        220
    );

    fontSize(
        Math.min(
            28,
            WIDTH * 0.066
        )
    );

    text(
        secondTitle,
        cx,
        secondTitleY
    );

    setGameUIFont();

    fill(
        245,
        238,
        228,
        205 +
            Math.sin(
                ElapsedTime * 4
            ) *
            24
    );

    fontSize(
        Math.min(
            22,
            WIDTH * 0.050
        )
    );

    textAlign(CENTER);

    text(
        startText,
        cx,
        startY
    );
}

function startTitleTransition() {
    gameState.titleTransition = {
        active: true,
        elapsed: 0,
        titleFadeDuration: 0.44,
        fizzDuration: 0.92,
        settleDuration: 0.16,
        handoffDuration: 1.78,
        sceneSwitchTime: 0.44,
        sceneSwitched: false,
        bubbles:
            createTitleTransitionBubbles(),
    };

    gameState.phase =
        "TITLE_TRANSITION";
}


function createTitleTransitionBubbles() {
    const bubbles = [];
    const count =
        Math.max(
            54,
            Math.floor(
                WIDTH / 6
            )
        );

    for (
        let index = 0;
        index < count;
        index += 1
    ) {
        bubbles.push(
            {
                x:
                    WIDTH *
                    (
                        0.10 +
                        Math.random() * 0.80
                    ),

                startY:
                    -HEIGHT * 0.10 -
                    Math.random() *
                    HEIGHT *
                    0.18,

                travel:
                    HEIGHT *
                    (
                        0.98 +
                        Math.random() * 0.46
                    ),

                size:
                    2.2 +
                    Math.random() * 7.8,

                delay:
                    Math.random() * 0.20,

                life:
                    0.84 +
                    Math.random() * 0.58,

                wobble:
                    5 +
                    Math.random() * 18,

                wobbleSpeed:
                    5 +
                    Math.random() * 9,

                phase:
                    Math.random() *
                    Math.PI *
                    2,
            }
        );
    }

    return bubbles;
}


function updateTitleStartTransition() {
    const transition =
        gameState.titleTransition;

    if (
        !transition ||
        !transition.active
    ) {
        return;
    }

    transition.elapsed +=
        Math.max(
            0,
            DeltaTime
        );

    const handoffStartTime =
        transition.fizzDuration +
        transition.settleDuration;

    const totalTime =
        handoffStartTime +
        transition.handoffDuration;

    if (
        !transition.sceneSwitched &&
        transition.elapsed >=
            transition.sceneSwitchTime
    ) {
        transition.sceneSwitched =
            true;

        gameState.phase =
            "INTRO_HANDOFF";

        updateLayout(true);
    }

    if (
        transition.elapsed >=
        totalTime
    ) {
        transition.active =
            false;

        gameState.titleTransition =
            null;

        if (
            gameState.phase ===
            "INTRO_HANDOFF"
        ) {
            gameState.phase =
                "WAIT_CAP_POWER";
        }
    }
}


function drawTitleStartTransition() {
    const transition =
        gameState &&
        gameState.titleTransition
            ? gameState.titleTransition
            : null;

    if (
        !transition ||
        !transition.active
    ) {
        return;
    }

    const elapsed =
        transition.elapsed;

    const titleFadeDuration =
        transition.titleFadeDuration;

    const fizzDuration =
        transition.fizzDuration;

    const settleDuration =
        transition.settleDuration;

    const handoffDuration =
        transition.handoffDuration;

    const fizzEndTime =
        fizzDuration;

    const handoffStartTime =
        fizzEndTime +
        settleDuration;

    let darkAlpha =
        0;

    let bubbleAlpha =
        0;

    let bubbleElapsed =
        -1;

    let handoffProgress =
        0;

    if (
        elapsed <
        titleFadeDuration
    ) {
        const t =
            Math.max(
                0,
                Math.min(
                    1,
                    elapsed /
                        titleFadeDuration
                )
            );

        const easedFade =
            1 -
            Math.pow(
                1 - t,
                3
            );

        const bubbleFadeIn =
            Math.max(
                0,
                Math.min(
                    1,
                    (
                        elapsed +
                        0.04
                    ) /
                        0.18
                )
            );

        darkAlpha =
            255 * easedFade;

        bubbleAlpha =
            245 *
            bubbleFadeIn;

        bubbleElapsed =
            elapsed;
    } else if (
        elapsed <
        fizzEndTime
    ) {
        const t =
            Math.max(
                0,
                Math.min(
                    1,
                    (
                        elapsed -
                        titleFadeDuration
                    ) /
                        Math.max(
                            0.01,
                            fizzEndTime -
                                titleFadeDuration
                        )
                )
            );

        const bubbleFadeOut =
            Math.max(
                0,
                Math.min(
                    1,
                    (
                        elapsed -
                        (
                            fizzEndTime -
                            0.28
                        )
                    ) /
                        0.28
                )
            );

        darkAlpha =
            255 *
            Math.pow(
                1 - t,
                1.7
            );

        bubbleAlpha =
            245 *
            (
                1 -
                Math.pow(
                    bubbleFadeOut,
                    1.35
                )
            );

        bubbleElapsed =
            elapsed;
    } else if (
        elapsed <
        handoffStartTime
    ) {
        darkAlpha =
            0;

        bubbleAlpha =
            0;
    } else {
        handoffProgress =
            Math.max(
                0,
                Math.min(
                    1,
                    (
                        elapsed -
                        handoffStartTime
                    ) /
                        handoffDuration
                )
            );
    }

    if (
        darkAlpha > 0
    ) {
        rectMode(CORNER);
        noStroke();

        fill(
            15,
            10,
            9,
            darkAlpha
        );

        rect(
            0,
            0,
            WIDTH,
            HEIGHT
        );
    }

    if (
        bubbleElapsed >= 0 &&
        bubbleAlpha > 0
    ) {
        const bubbles =
            transition.bubbles || [];

        for (
            let index = 0;
            index < bubbles.length;
            index += 1
        ) {
            const bubble =
                bubbles[index];

            const p =
                Math.max(
                    0,
                    Math.min(
                        1,
                        (
                            bubbleElapsed -
                            bubble.delay
                        ) /
                            bubble.life
                    )
                );

            if (
                bubbleElapsed <
                    bubble.delay ||
                p <= 0 ||
                p >= 1
            ) {
                continue;
            }

            const rise =
                p *
                bubble.travel;

            const bx =
                bubble.x +
                Math.sin(
                    p *
                        bubble.wobbleSpeed +
                        bubble.phase
                ) *
                    bubble.wobble;

            const by =
                bubble.startY +
                rise;

            const size =
                bubble.size *
                (
                    0.72 +
                    p * 0.58
                );

            const localAlpha =
                bubbleAlpha *
                Math.sin(
                    p * Math.PI
                );

            noFill();

            stroke(
                221,
                246,
                250,
                localAlpha * 0.86
            );

            strokeWidth(
                Math.max(
                    0.8,
                    size * 0.14
                )
            );

            ellipse(
                bx,
                by,
                size
            );

            stroke(
                255,
                239,
                198,
                localAlpha * 0.38
            );

            strokeWidth(
                Math.max(
                    0.6,
                    size * 0.075
                )
            );

            ellipse(
                bx -
                    size * 0.16,
                by +
                    size * 0.12,
                size * 0.42
            );

            noStroke();

            fill(
                255,
                247,
                224,
                localAlpha * 0.38
            );

            ellipse(
                bx -
                    size * 0.18,
                by +
                    size * 0.20,
                Math.max(
                    1.2,
                    size * 0.18
                )
            );
        }
    }

    if (
        transition.sceneSwitched &&
        handoffProgress > 0
    ) {
        drawTitlePressureHandoff(
            handoffProgress
        );
    }

    rectMode(CORNER);
    noStroke();
}



function drawTitlePressureHandoff(
    progress
) {
    if (
        !layout ||
        !layout.board ||
        !layout.cap
    ) {
        return;
    }

    const capPanel =
        layout.cap;

    const gauge =
        getMainGaugeLayout(
            capPanel
        );

    const startPosition =
        typeof getBoardNodeScreenPosition ===
        "function"
            ? getBoardNodeScreenPosition(
                "start"
            )
            : {
                x:
                    layout.board.x +
                    layout.board.w * 0.50,
                y:
                    layout.board.y +
                    layout.board.h * 0.50,
            };

    const sourceX =
        startPosition.x;

    const sourceY =
        startPosition.y;

    const targetX =
        capPanel.x +
        gauge.centerX;

    const targetY =
        capPanel.y +
        gauge.centerY;

    const travelProgress =
        Math.max(
            0,
            Math.min(
                1,
                (
                    progress -
                    0.10
                ) /
                    0.34
            )
        );

    const retractProgress =
        Math.max(
            0,
            Math.min(
                1,
                (
                    progress -
                    0.44
                ) /
                    0.20
            )
        );

    const easedRetract =
        1 -
        Math.pow(
            1 -
                retractProgress,
            2
        );

    const beamHeadProgress =
        travelProgress;

    const beamTailProgress =
        travelProgress < 1
            ? 0
            : easedRetract;

    const meterProgress =
        Math.max(
            0,
            Math.min(
                1,
                (
                    progress -
                    0.62
                ) /
                    0.34
            )
        );

    const beamFadeOut =
        Math.max(
            0,
            Math.min(
                1,
                (
                    1 -
                    progress
                ) /
                    0.12
            )
        );

    const beamLength =
        Math.max(
            0,
            beamHeadProgress -
                beamTailProgress
        );

    const beamStartX =
        sourceX +
        (
            targetX -
            sourceX
        ) *
            beamTailProgress;

    const beamStartY =
        sourceY +
        (
            targetY -
            sourceY
        ) *
            beamTailProgress;

    const beamHeadX =
        sourceX +
        (
            targetX -
            sourceX
        ) *
            beamHeadProgress;

    const beamHeadY =
        sourceY +
        (
            targetY -
            sourceY
        ) *
            beamHeadProgress;

    const beamAlpha =
        (
            34 +
            travelProgress * 108
        ) *
        beamFadeOut;

    if (
        beamLength > 0.012
    ) {
        noFill();

        stroke(
            234,
            176,
            94,
            beamAlpha * 0.18
        );

        strokeWidth(4);

        line(
            beamStartX,
            beamStartY,
            beamHeadX,
            beamHeadY
        );

        stroke(
            255,
            230,
            177,
            beamAlpha * 0.72
        );

        strokeWidth(1.2);

        line(
            beamStartX,
            beamStartY,
            beamHeadX,
            beamHeadY
        );

        noStroke();

        const tailDotCount =
            4;

        for (
            let index = 0;
            index < tailDotCount;
            index += 1
        ) {
            const ratio =
                (
                    index + 1
                ) /
                (
                    tailDotCount + 1
                );

            const dotProgress =
                beamHeadProgress -
                beamLength * ratio;

            const dotX =
                sourceX +
                (
                    targetX -
                    sourceX
                ) *
                    dotProgress;

            const dotY =
                sourceY +
                (
                    targetY -
                    sourceY
                ) *
                    dotProgress;

            fill(
                255,
                220,
                149,
                beamAlpha *
                    (
                        0.22 -
                        index * 0.035
                    )
            );

            ellipse(
                dotX,
                dotY,
                3.8 -
                    index * 0.42
            );
        }
    }

    if (
        beamHeadProgress > 0 &&
        beamLength > 0.012
    ) {
        const headGlow =
            beamAlpha *
            (
                0.70 +
                (
                    1 -
                    beamLength
                ) *
                    0.30
            );

        noFill();

        stroke(
            255,
            238,
            192,
            headGlow
        );

        strokeWidth(2);

        ellipse(
            beamHeadX,
            beamHeadY,
            12 +
                Math.sin(
                    beamHeadProgress *
                        Math.PI
                ) *
                    4
        );

        noStroke();

        fill(
            255,
            226,
            154,
            headGlow
        );

        ellipse(
            beamHeadX,
            beamHeadY,
            5
        );
    }

    if (
        travelProgress >= 1 &&
        retractProgress > 0 &&
        retractProgress < 1
    ) {
        const collapseGlow =
            Math.sin(
                retractProgress *
                    Math.PI
            );

        noFill();

        stroke(
            255,
            232,
            174,
            150 *
                collapseGlow *
                beamFadeOut
        );

        strokeWidth(1.4);

        ellipse(
            targetX,
            targetY,
            gauge.radius *
                (
                    0.24 +
                    collapseGlow *
                        0.22
                )
        );

        noStroke();

        fill(
            255,
            226,
            154,
            130 *
                collapseGlow *
                beamFadeOut
        );

        ellipse(
            targetX,
            targetY,
            gauge.radius *
                (
                    0.09 +
                    collapseGlow *
                        0.04
                )
        );
    }

    drawTitleGaugeStartupLights(
        targetX,
        targetY,
        gauge.radius,
        meterProgress,
        1
    );

    noStroke();
}


function drawTitleGaugeStartupLights(
    centerX,
    centerY,
    radius,
    progress,
    fadeOut
) {
    if (
        progress <= 0 ||
        fadeOut <= 0
    ) {
        return;
    }

    const startAngle =
        205;

    const endAngle =
        -25;

    const zones = [
        {
            start: 0,
            end:
                CONFIG.capPowerZone1End,
            color: {
                r: 166,
                g: 184,
                b: 104,
            },
        },
        {
            start:
                CONFIG.capPowerZone1End,
            end:
                CONFIG.capPowerZone2End,
            color: {
                r: 224,
                g: 176,
                b: 85,
            },
        },
        {
            start:
                CONFIG.capPowerZone2End,
            end:
                CONFIG.capPowerZone3End,
            color: {
                r: 229,
                g: 126,
                b: 64,
            },
        },
        {
            start:
                CONFIG.capPowerZone3End,
            end: 1,
            color: {
                r: 235,
                g: 88,
                b: 76,
            },
        },
    ];

    const sequenceEnd =
        0.66;

    const allFlashStart =
        0.72;

    const allFlashEnd =
        0.98;

    const sequenceProgress =
        Math.max(
            0,
            Math.min(
                1,
                progress /
                    sequenceEnd
            )
        );

    for (
        let index = 0;
        index < zones.length;
        index += 1
    ) {
        const zone =
            zones[index];

        const stepStart =
            index /
            zones.length;

        const stepEnd =
            (
                index + 1
            ) /
            zones.length;

        const localProgress =
            Math.max(
                0,
                Math.min(
                    1,
                    (
                        sequenceProgress -
                        stepStart
                    ) /
                        (
                            stepEnd -
                            stepStart
                        )
                )
            );

        if (
            sequenceProgress <
                stepStart ||
            sequenceProgress >
                stepEnd
        ) {
            continue;
        }

        const flash =
            Math.sin(
                localProgress *
                    Math.PI
            );

        if (
            flash <= 0
        ) {
            continue;
        }

        drawTitleGaugeLightArc(
            centerX,
            centerY,
            radius,
            startAngle,
            endAngle,
            zone.start,
            zone.end,
            zone.color,
            flash,
            fadeOut
        );
    }

    const allFlashProgress =
        Math.max(
            0,
            Math.min(
                1,
                (
                    progress -
                    allFlashStart
                ) /
                    (
                        allFlashEnd -
                        allFlashStart
                    )
            )
        );

    if (
        progress <
        allFlashStart
    ) {
        return;
    }

    let allFlash =
        0;

    if (
        allFlashProgress <
        0.24
    ) {
        const t =
            allFlashProgress /
            0.24;

        allFlash =
            1 -
            Math.pow(
                1 - t,
                3
            );
    } else if (
        allFlashProgress <
        0.64
    ) {
        allFlash =
            1;
    } else {
        const t =
            (
                allFlashProgress -
                0.64
            ) /
            0.36;

        allFlash =
            Math.max(
                0,
                1 -
                    t
            );
    }

    for (
        let index = 0;
        index < zones.length;
        index += 1
    ) {
        const zone =
            zones[index];

        drawTitleGaugeLightArc(
            centerX,
            centerY,
            radius,
            startAngle,
            endAngle,
            zone.start,
            zone.end,
            zone.color,
            allFlash,
            fadeOut
        );
    }
}


function drawTitleGaugeLightArc(
    centerX,
    centerY,
    radius,
    startAngle,
    endAngle,
    rangeStart,
    rangeEnd,
    lightColor,
    flash,
    fadeOut
) {
    const arcRadius =
        radius * 0.96;

    const segmentCount =
        7;

    const glowAlpha =
        170 *
        flash *
        fadeOut;

    const coreAlpha =
        255 *
        flash *
        fadeOut;

    for (
        let index = 0;
        index < segmentCount;
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
                        index + 1
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

        const x1 =
            centerX +
            Math.cos(
                angle1
            ) *
                arcRadius;

        const y1 =
            centerY +
            Math.sin(
                angle1
            ) *
                arcRadius;

        const x2 =
            centerX +
            Math.cos(
                angle2
            ) *
                arcRadius;

        const y2 =
            centerY +
            Math.sin(
                angle2
            ) *
                arcRadius;

        stroke(
            lightColor.r,
            lightColor.g,
            lightColor.b,
            glowAlpha * 0.24
        );

        strokeWidth(9);

        line(
            x1,
            y1,
            x2,
            y2
        );

        stroke(
            255,
            240,
            190,
            glowAlpha * 0.48
        );

        strokeWidth(5);

        line(
            x1,
            y1,
            x2,
            y2
        );

        stroke(
            lightColor.r,
            lightColor.g,
            lightColor.b,
            coreAlpha
        );

        strokeWidth(3.4);

        line(
            x1,
            y1,
            x2,
            y2
        );
    }

    noStroke();
}


function drawPreviewScreen() {
    drawBoardPanel();
    drawBoardStationActivation();
    drawExactStopEffect();

    const capPanelHidden =
        gameState.phase === "MOVING" ||
        gameState.phase === "MOVE_COUNT_TICK" ||
        gameState.phase === "MOVE_COUNT_ZERO" ||
        gameState.phase === "LANDING";

    if (!capPanelHidden) {
        drawCapPanel();
    }

    const storedGarnish =
        gameState.glass.garnish;

    gameState.previewGarnishTray =
        storedGarnish;

    gameState.glass.garnish =
        null;

    drawBottleInspectionPanel();

    gameState.glass.garnish =
        storedGarnish;

    gameState.previewGarnishTray =
        null;

    drawCapacitySpillTokenOverlay();
    drawBottleShakeRig();
    drawBottleChillIndicator();

    if (
        typeof drawBottleCoolingFog ===
        "function"
    ) {
        drawBottleCoolingFog();
    }

    drawBottleCoolingEffect();
    drawLandingIngredientSource();
    drawFlyingIngredient();
    drawBurstFlash();
    drawCarbonationParticles();
    drawBurstToken();
    drawSpilledTokens();
    drawGlassFullMessage();
    drawMoveCounter();
    drawCapSnapEffect();
    drawLanguageButton();
    drawIngredientGetBackdrop();
    drawIngredientGetEffect();

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

    const goalPosition =
        getBoardNodeScreenPosition(
            "goal"
        );

    const bottleCenterX =
        goalPosition.x;

    const bottleCenterY =
        goalPosition.y +
        CONFIG.boardBottleRailOffset -
        (
            CONFIG.boardBottleScreenLift ||
            0
        );

    const mouthPosition =
        getBoardBottleMouthScreenPosition(
            "goal"
        );

    fill(
        5,
        3,
        3,
        effect.alpha * 0.42
    );

    noStroke();

    rectMode(CORNER);

    rect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    const ringSize =
        46 +
        effect.ring * 68;

    noFill();

    stroke(
        255,
        220,
        125,
        effect.alpha *
        (
            0.45 +
            effect.complete * 0.45
        )
    );

    strokeWidth(
        2.5 +
        effect.complete * 2
    );

    ellipse(
        bottleCenterX,
        bottleCenterY,
        ringSize
    );

    stroke(
        255,
        245,
        205,
        effect.alpha *
        (
            0.18 +
            effect.complete * 0.34
        )
    );

    strokeWidth(2);

    ellipse(
        bottleCenterX,
        bottleCenterY,
        ringSize * 1.42
    );

    noStroke();

    drawBoardBottleToken(
        goalPosition.x,
        goalPosition.y,
        1 +
        effect.press * 0.04 +
        effect.complete * 0.08,
        0,
        effect.alpha
    );

    const capX =
        mouthPosition.x;

    const capY =
        mouthPosition.y +
        (
            1 -
            effect.capProgress
        ) *
        CONFIG.goalCapStartOffset -
        effect.press * 3;

    const pressStemTop =
        capY +
        CONFIG.goalPressStemLength +
        13;

    stroke(
        24,
        15,
        12,
        effect.alpha * 0.90
    );

    strokeWidth(10);

    line(
        capX,
        pressStemTop,
        capX,
        capY + 14
    );

    stroke(
        167,
        109,
        59,
        effect.alpha
    );

    strokeWidth(6);

    line(
        capX,
        pressStemTop,
        capX,
        capY + 14
    );

    stroke(
        239,
        191,
        117,
        effect.alpha * 0.62
    );

    strokeWidth(1.5);

    line(
        capX - 2,
        pressStemTop,
        capX - 2,
        capY + 14
    );

    noStroke();

    rectMode(CENTER);

    fill(
        40,
        26,
        21,
        effect.alpha
    );

    rect(
        capX,
        capY + 17,
        CONFIG.goalPressHeadWidth + 5,
        CONFIG.goalPressHeadHeight + 4,
        4
    );

    fill(
        157,
        101,
        55,
        effect.alpha
    );

    rect(
        capX,
        capY + 17,
        CONFIG.goalPressHeadWidth,
        CONFIG.goalPressHeadHeight,
        3
    );

    fill(
        235,
        183,
        107,
        effect.alpha * 0.68
    );

    rect(
        capX,
        capY + 19,
        CONFIG.goalPressHeadWidth - 8,
        2,
        1
    );

    rectMode(CORNER);

    drawCap(
        capX,
        capY,
        effect.capRotation,
        CONFIG.goalCapSize *
        (
            0.84 +
            effect.capProgress * 0.16 +
            effect.press * 0.10
        )
    );

    if (
        effect.press > 0.18
    ) {
        const sparkAlpha =
            effect.alpha *
            effect.press;

        stroke(
            255,
            224,
            142,
            sparkAlpha
        );

        strokeWidth(2);

        for (
            let index = 0;
            index < 8;
            index += 1
        ) {
            const angle =
                index *
                Math.PI /
                4;

            const innerRadius =
                11;

            const outerRadius =
                16 +
                effect.press * 10;

            line(
                capX +
                Math.cos(
                    angle
                ) *
                innerRadius,
                mouthPosition.y +
                Math.sin(
                    angle
                ) *
                innerRadius,
                capX +
                Math.cos(
                    angle
                ) *
                outerRadius,
                mouthPosition.y +
                Math.sin(
                    angle
                ) *
                outerRadius
            );
        }

        noStroke();
    }

    if (
        effect.labelProgress > 0
    ) {
        const labelAlpha =
            effect.alpha *
            effect.labelProgress;

        const labelX =
            bottleCenterX +
            (
                1 -
                effect.labelProgress
            ) *
            CONFIG.goalLabelStartOffset;

        const labelY =
            bottleCenterY - 3;

        pushMatrix();

        translate(
            labelX,
            labelY
        );

        rotate(
            (
                1 -
                effect.labelProgress
            ) *
            24
        );

        scale(
            0.72 +
            effect.labelProgress * 0.28,
            0.72 +
            effect.labelProgress * 0.28
        );

        rectMode(CENTER);

        fill(
            24,
            15,
            12,
            labelAlpha * 0.42
        );

        rect(
            2,
            -2,
            CONFIG.goalLabelWidth + 5,
            CONFIG.goalLabelHeight + 5,
            4
        );

        fill(
            238,
            216,
            178,
            labelAlpha
        );

        rect(
            0,
            0,
            CONFIG.goalLabelWidth,
            CONFIG.goalLabelHeight,
            3
        );

        fill(
            151,
            55,
            43,
            labelAlpha
        );

        ellipse(
            0,
            0,
            6
        );

        fill(
            244,
            208,
            133,
            labelAlpha
        );

        ellipse(
            0,
            0,
            2.5
        );

        rectMode(CORNER);

        popMatrix();
    }

    rectMode(CORNER);
    noStroke();
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

    const resultGlassKind =
        getResultGlassDrinkKind();

    const resultVisualSetOffsetXPortrait =
        14;

    const resultVisualSetOffsetYPortrait =
        18;

    const resultVisualSetOffsetXLandscape =
        0;

    const resultVisualSetOffsetYLandscape =
        0;

    const resultVisualSetOffsetX =
        portrait
            ? resultVisualSetOffsetXPortrait
            : resultVisualSetOffsetXLandscape;

    const resultVisualSetOffsetY =
        portrait
            ? resultVisualSetOffsetYPortrait
            : resultVisualSetOffsetYLandscape;

    const noGlassVisualShiftX =
        resultGlassKind === "none"
            ? (
                portrait
                    ? WIDTH * 0.12
                    : WIDTH * 0.075
            )
            : 0;

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

    let bottleX;
    let bottleY;
    let bottleScale;
    let tastingGlassX;
    let tastingGlassY;
    let tastingGlassScale;
    let crownX;
    let crownY;
    let crownSize;
    let textX;
    let nameY;
    let ingredientY;
    let contentWidth;

    if (portrait) {
        bottleX =
            WIDTH * 0.35;

        bottleY =
            HEIGHT * 0.64;

        bottleScale =
            Math.min(
                0.78,
                WIDTH / 490
            );

        tastingGlassX =
            WIDTH * 0.615;

        tastingGlassScale =
            Math.min(
                0.34,
                WIDTH / 1080
            );

        const resultBottleLocalBottom =
            -CONFIG.inspectionBottleBodyHeight *
                0.5 -
            18;

        const resultBottleBottomY =
            bottleY +
            resultBottleLocalBottom *
                bottleScale;

        tastingGlassY =
            resultBottleBottomY +
            115 *
                tastingGlassScale;

        crownX =
            bottleX +
            60 * bottleScale;

        crownY =
            bottleY +
            117 * bottleScale;

        crownSize =
            Math.min(
                28,
                WIDTH * 0.070
            );

        textX =
            WIDTH * 0.5;

        nameY =
            HEIGHT * 0.406;

        ingredientY =
            HEIGHT * 0.176;

        contentWidth =
            WIDTH - 54;
    } else {
        bottleX =
            WIDTH * 0.27;

        bottleY =
            HEIGHT * 0.55;

        bottleScale =
            Math.min(
                0.78,
                HEIGHT / 520
            );

        tastingGlassX =
            WIDTH * 0.43;

        tastingGlassScale =
            Math.min(
                0.31,
                HEIGHT / 820
            );

        const resultBottleLocalBottom =
            -CONFIG.inspectionBottleBodyHeight *
                0.5 -
            18;

        const resultBottleBottomY =
            bottleY +
            resultBottleLocalBottom *
                bottleScale;

        tastingGlassY =
            resultBottleBottomY +
            115 *
                tastingGlassScale;

        crownX =
            bottleX +
            60 * bottleScale;

        crownY =
            bottleY +
            114 * bottleScale;

        crownSize =
            Math.min(
                29,
                HEIGHT * 0.070
            );

        textX =
            WIDTH * 0.72;

        nameY =
            HEIGHT * 0.66;

        ingredientY =
            HEIGHT * 0.255;

        contentWidth =
            WIDTH * 0.48;
    }

    bottleX +=
        resultVisualSetOffsetX +
        noGlassVisualShiftX;

    bottleY +=
        resultVisualSetOffsetY;

    tastingGlassX +=
        resultVisualSetOffsetX +
        noGlassVisualShiftX;

    tastingGlassY +=
        resultVisualSetOffsetY;

    crownX +=
        resultVisualSetOffsetX +
        noGlassVisualShiftX;

    crownY +=
        resultVisualSetOffsetY;

    noFill();

    stroke(
        199,
        121,
        45,
        alpha * 0.16
    );

    strokeWidth(7);

    ellipse(
        bottleX,
        bottleY,
        176 *
            bottleScale +
            Math.sin(
                ElapsedTime * 2.4
            ) *
            4
    );

    stroke(
        235,
        169,
        70,
        alpha * 0.27
    );

    strokeWidth(2);

    ellipse(
        bottleX,
        bottleY,
        198 *
            bottleScale
    );

    noStroke();

    drawResultProductBottle(
        bottleX,
        bottleY,
        bottleScale,
        alpha
    );

    drawResultBottleVisualCode(
        bottleX,
        bottleY,
        bottleScale,
        alpha
    );

    drawResultTastingSet(
        tastingGlassX,
        tastingGlassY,
        tastingGlassScale,
        crownX,
        crownY,
        crownSize,
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
            ? 26
            : 31;

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
                27,
                WIDTH * 0.066
            )
            : Math.min(
                34,
                WIDTH * 0.041
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
                ? 25
                : 38
        );

    fill(
        220,
        202,
        180,
        alpha * 0.92
    );

    fontSize(
        portrait
            ? Math.min(
                12.5,
                WIDTH * 0.031
            )
            : Math.min(
                15,
                WIDTH * 0.020
            )
    );

    const descriptionGap =
        portrait
            ? 17
            : 18;

    const extraNameLines =
        Math.max(
            0,
            nameLines.length - 1
        );

    const descriptionBaseY =
        portrait
            ? HEIGHT * 0.292
            : HEIGHT * 0.454;

    const descriptionY =
        descriptionBaseY -
        extraNameLines *
            (
                portrait
                    ? 12
                    : 10
            );

    const descriptionStartY =
        descriptionY +
        (
            descriptionLines.length -
            1
        ) *
        descriptionGap *
        0.5;

    textAlign(CENTER);

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

    textAlign(CENTER);

    text(
        gameState.language === "ja"
            ? "もう一度つくる"
            : "MAKE ANOTHER",
        button.x +
            button.w * 0.5,
        button.y +
            button.h * 0.5
    );

    popMatrix();

    drawLanguageButton();
}




function drawResultNameOrnaments(
    textX,
    nameY,
    portrait,
    nameLines,
    alpha
) {
    const nameGap =
        portrait
            ? 26
            : 31;

    const nameStartY =
        nameY +
        (
            nameLines.length -
            1
        ) *
        nameGap *
        0.5;

    const nameTopY =
        nameStartY;

    const nameBottomY =
        nameStartY -
        (
            nameLines.length -
            1
        ) *
            nameGap;

    const extraLines =
        Math.max(
            0,
            nameLines.length - 1
        );

    const bottomGap =
        (
            portrait
                ? 26
                : 30
        ) +
        extraLines *
            (
                portrait
                    ? 3
                    : 3
            );

    const topOpticalCompensation =
        portrait
            ? 11
            : 13;

    const topGap =
        bottomGap +
        topOpticalCompensation;

    const topY =
        nameTopY +
        topGap;

    const bottomY =
        nameBottomY -
        bottomGap;

    const topHalfWidth =
        portrait
            ? 48
            : 58;

    const bottomHalfWidth =
        portrait
            ? 86
            : 104;

    noFill();

    stroke(
        214,
        142,
        68,
        alpha * 0.38
    );

    strokeWidth(1.2);

    line(
        textX -
            topHalfWidth,
        topY,
        textX - 10,
        topY
    );

    line(
        textX + 10,
        topY,
        textX +
            topHalfWidth,
        topY
    );

    line(
        textX -
            bottomHalfWidth,
        bottomY,
        textX +
            bottomHalfWidth,
        bottomY
    );

    noStroke();

    fill(
        238,
        186,
        98,
        alpha * 0.48
    );

    pushMatrix();

    translate(
        textX,
        topY
    );

    rotate(45);

    rectMode(CENTER);

    rect(
        0,
        0,
        5,
        5,
        1
    );

    popMatrix();

    fill(
        238,
        186,
        98,
        alpha * 0.28
    );

    ellipse(
        textX -
            bottomHalfWidth -
            10,
        bottomY,
        2.6
    );

    ellipse(
        textX +
            bottomHalfWidth +
            10,
        bottomY,
        2.6
    );

    rectMode(CORNER);
}



function drawResultRestartButtonAccent(
    button,
    alpha
) {
    noFill();

    stroke(
        233,
        178,
        104,
        alpha * 0.34
    );

    strokeWidth(1.2);

    rect(
        button.x + 6,
        button.y + 6,
        button.w - 12,
        button.h - 12,
        8
    );

    stroke(
        255,
        225,
        176,
        alpha * 0.22
    );

    strokeWidth(1);

    line(
        button.x + 16,
        button.y +
            button.h - 11,
        button.x +
            button.w - 16,
        button.y +
            button.h - 11
    );

    noStroke();

    fill(
        246,
        197,
        126,
        alpha * 0.24
    );

    ellipse(
        button.x + 15,
        button.y +
            button.h * 0.5,
        3
    );

    ellipse(
        button.x +
            button.w - 15,
        button.y +
            button.h * 0.5,
        3
    );
}

function drawResultHeaderClean(
    alpha
) {
    const headerY =
        HEIGHT - 43;

    const headerFontSize =
        Math.min(
            24,
            WIDTH * 0.061
        );

    const cardMargin =
        14;

    const maskX =
        cardMargin + 9;

    const maskW =
        WIDTH -
        (
            cardMargin +
            9
        ) *
            2;

    rectMode(CORNER);
    noStroke();

    fill(
        35,
        18,
        12,
        alpha
    );

    rect(
        maskX,
        headerY - 19,
        maskW,
        38,
        4
    );

    if (
        typeof setGameTitleFont ===
        "function"
    ) {
        setGameTitleFont();
    }

    const centerX =
        WIDTH * 0.5;

    const titleHalfWidth =
        headerFontSize *
        3.45;

    const titleGap =
        13;

    const lineWidth =
        Math.min(
            76,
            WIDTH * 0.18
        );

    const leftLineEnd =
        centerX -
        titleHalfWidth -
        titleGap;

    const rightLineStart =
        centerX +
        titleHalfWidth +
        titleGap;

    const leftLineStart =
        Math.max(
            cardMargin + 42,
            leftLineEnd -
                lineWidth
        );

    const rightLineEnd =
        Math.min(
            WIDTH -
                cardMargin -
                42,
            rightLineStart +
                lineWidth
        );

    stroke(
        174,
        101,
        45,
        alpha * 0.75
    );

    strokeWidth(2);

    if (
        leftLineEnd >
        leftLineStart
    ) {
        line(
            leftLineStart,
            headerY,
            leftLineEnd,
            headerY
        );
    }

    if (
        rightLineEnd >
        rightLineStart
    ) {
        line(
            rightLineStart,
            headerY,
            rightLineEnd,
            headerY
        );
    }

    noStroke();

    fill(
        232,
        167,
        73,
        alpha
    );

    fontSize(
        headerFontSize
    );

    textAlign(CENTER);

    text(
        "COLA ROLL",
        centerX,
        headerY
    );

    rectMode(CORNER);
}


function drawResultScreenRefinements() {
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

    let textX;
    let nameY;

    if (portrait) {
        textX =
            WIDTH * 0.5;

        nameY =
            HEIGHT * 0.392;
    } else {
        textX =
            WIDTH * 0.72;

        nameY =
            HEIGHT * 0.66;
    }

    const resultName =
        generateResultName();

    const nameLines =
        splitResultName(
            resultName
        );

    const button =
        getResultRestartButtonRect();

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

    drawResultHeaderClean(
        alpha
    );

    drawResultNameOrnaments(
        textX,
        nameY,
        portrait,
        nameLines,
        alpha
    );

    drawResultRestartButtonAccent(
        button,
        alpha
    );

    popMatrix();
}


const drawResultScreenBase =
    drawResultScreen;

drawResultScreen = function() {
    drawResultScreenBase();
    drawResultScreenRefinements();
};



function drawResultBottleVisualCode(
    x,
    y,
    scaleValue,
    alpha
) {
    const design =
        getResultBottleLabelDesign();

    const base =
        design.base;

    const light =
        design.light;

    const dark =
        design.dark;

    const labelW =
        68;

    const labelH =
        79;

    pushMatrix();

    translate(
        x,
        y
    );

    scale(
        scaleValue,
        scaleValue
    );

    rectMode(CENTER);
    ellipseMode(CENTER);
    noStroke();

    fill(
        18,
        10,
        8,
        alpha * 0.42
    );

    rect(
        2,
        -2,
        labelW + 9,
        labelH + 9,
        11
    );

    fill(
        246,
        220,
        160,
        alpha * 0.92
    );

    rect(
        0,
        0,
        labelW,
        labelH,
        10
    );

    fill(
        base.r,
        base.g,
        base.b,
        alpha * 0.90
    );

    rect(
        0,
        0,
        labelW - 8,
        labelH - 8,
        8
    );

    fill(
        255,
        236,
        185,
        alpha * 0.16
    );

    rect(
        0,
        16,
        labelW - 15,
        18,
        5
    );

    noFill();

    stroke(
        dark.r,
        dark.g,
        dark.b,
        alpha * 0.78
    );

    strokeWidth(2);

    rect(
        0,
        0,
        labelW,
        labelH,
        10
    );

    stroke(
        light.r,
        light.g,
        light.b,
        alpha * 0.72
    );

    strokeWidth(1.2);

    rect(
        0,
        0,
        labelW - 13,
        labelH - 13,
        7
    );

    noStroke();

    if (
        design.pattern ===
        "spice"
    ) {
        stroke(
            dark.r,
            dark.g,
            dark.b,
            alpha * 0.42
        );

        strokeWidth(1.6);

        for (
            let index = 0;
            index < 4;
            index += 1
        ) {
            const lineY =
                27 -
                index * 17;

            line(
                -28,
                lineY - 6,
                -19,
                lineY + 3
            );

            line(
                19,
                lineY + 3,
                28,
                lineY - 6
            );
        }

        noStroke();
    } else if (
        design.pattern ===
        "fresh"
    ) {
        fill(
            light.r,
            light.g,
            light.b,
            alpha * 0.30
        );

        ellipse(
            -23,
            25,
            7
        );

        ellipse(
            24,
            16,
            5
        );

        ellipse(
            -25,
            -22,
            5
        );
    } else if (
        design.pattern ===
        "mystery"
    ) {
        for (
            let index = 0;
            index < 4;
            index += 1
        ) {
            pushMatrix();

            translate(
                index % 2 === 0
                    ? -24
                    : 24,
                24 -
                    index * 16
            );

            rotate(45);

            rectMode(CENTER);

            fill(
                light.r,
                light.g,
                light.b,
                alpha * 0.26
            );

            rect(
                0,
                0,
                6,
                6,
                1
            );

            popMatrix();
        }
    } else if (
        design.pattern ===
        "heavy"
    ) {
        fill(
            dark.r,
            dark.g,
            dark.b,
            alpha * 0.28
        );

        rect(
            0,
            25,
            labelW - 18,
            5,
            2
        );

        rect(
            0,
            -25,
            labelW - 18,
            5,
            2
        );
    } else if (
        design.pattern ===
        "drop"
    ) {
        fill(
            light.r,
            light.g,
            light.b,
            alpha * 0.28
        );

        ellipse(
            -23,
            23,
            7,
            10
        );

        ellipse(
            24,
            -20,
            6,
            9
        );
    } else {
        noFill();

        stroke(
            light.r,
            light.g,
            light.b,
            alpha * 0.36
        );

        strokeWidth(1.5);

        ellipse(
            -24,
            20,
            8
        );

        ellipse(
            23,
            -20,
            7
        );

        noStroke();
    }

    fill(
        21,
        12,
        10,
        alpha * 0.32
    );

    ellipse(
        0,
        1,
        34,
        34
    );

    drawResultLabelMainMark(
        design,
        alpha
    );

    if (
        design.stillFinish
    ) {
        stroke(
            255,
            236,
            188,
            alpha * 0.62
        );

        strokeWidth(1.6);

        line(
            -22,
            -29,
            22,
            -29
        );

        line(
            -17,
            -24,
            17,
            -24
        );

        noStroke();

        fill(
            255,
            236,
            188,
            alpha * 0.26
        );

        rect(
            0,
            30,
            25,
            4,
            2
        );
    } else {
        const bubbleCount =
            Math.max(
                2,
                Math.min(
                    8,
                    design.carbonationGets +
                    design.pressure +
                    (
                        design.burstCount > 0
                            ? 2
                            : 0
                    )
                )
            );

        for (
            let index = 0;
            index < bubbleCount;
            index += 1
        ) {
            const bubbleX =
                -27 +
                (
                    index % 4
                ) *
                18;

            const bubbleY =
                -28 +
                Math.floor(
                    index / 4
                ) *
                12 +
                (
                    index % 2
                ) *
                3;

            noFill();

            stroke(
                217,
                241,
                247,
                alpha *
                (
                    design.burstCount > 0
                        ? 0.74
                        : 0.54
                )
            );

            strokeWidth(1.2);

            ellipse(
                bubbleX,
                bubbleY,
                4 +
                (
                    index % 3
                )
            );

            noStroke();
        }
    }

    if (
        design.coolingCount > 0
    ) {
        stroke(
            207,
            239,
            247,
            alpha *
            (
                0.44 +
                design.coolingCount * 0.10
            )
        );

        strokeWidth(
            1.2 +
            design.coolingCount * 0.22
        );

        line(
            -25,
            35,
            -13,
            35
        );

        line(
            -19,
            29,
            -19,
            41
        );

        line(
            13,
            35,
            25,
            35
        );

        line(
            19,
            29,
            19,
            41
        );

        noStroke();

        fill(
            210,
            244,
            255,
            alpha * 0.40
        );

        ellipse(
            -28,
            -2,
            4,
            7
        );

        ellipse(
            29,
            12,
            3,
            6
        );
    }

    if (
        design.hasSecret &&
        design.symbol !==
            "diamond"
    ) {
        pushMatrix();

        translate(
            0,
            -31
        );

        rotate(45);

        rectMode(CENTER);

        fill(
            94,
            45,
            119,
            alpha * 0.86
        );

        rect(
            0,
            0,
            8,
            8,
            2
        );

        fill(
            223,
            169,
            236,
            alpha * 0.52
        );

        rect(
            0,
            0,
            3,
            3,
            1
        );

        popMatrix();
    }

    if (
        design.garnish
    ) {
        const markX =
            design.garnish === "cherry"
                ? -25
                : 25;

        const markY =
            -31;

        if (
            design.garnish ===
            "cherry"
        ) {
            fill(
                204,
                56,
                54,
                alpha
            );

            ellipse(
                markX,
                markY,
                8
            );

            fill(
                255,
                158,
                143,
                alpha * 0.72
            );

            ellipse(
                markX - 2,
                markY + 2,
                2.5
            );
        } else {
            noFill();

            stroke(
                227,
                218,
                70,
                alpha
            );

            strokeWidth(2.5);

            ellipse(
                markX,
                markY,
                9
            );

            stroke(
                88,
                130,
                65,
                alpha
            );

            strokeWidth(1.4);

            line(
                markX - 4,
                markY,
                markX + 4,
                markY
            );

            noStroke();
        }
    }

    if (
        design.perfectStopCount > 0
    ) {
        noFill();

        stroke(
            247,
            204,
            104,
            alpha *
            (
                design.perfectGoal
                    ? 0.95
                    : 0.70
            )
        );

        strokeWidth(
            design.perfectGoal
                ? 2.5
                : 1.6
        );

        rect(
            0,
            0,
            labelW - 5,
            labelH - 5,
            8
        );

        if (
            design.perfectGoal
        ) {
            rect(
                0,
                0,
                labelW - 12,
                labelH - 12,
                6
            );
        }

        noStroke();

        const studPositions = [
            {
                x: -28,
                y: 33,
            },
            {
                x: 28,
                y: 33,
            },
            {
                x: -28,
                y: -33,
            },
            {
                x: 28,
                y: -33,
            },
        ];

        for (
            const stud of
            studPositions
        ) {
            fill(
                249,
                214,
                126,
                alpha *
                (
                    design.perfectGoal
                        ? 0.95
                        : 0.72
                )
            );

            ellipse(
                stud.x,
                stud.y,
                design.perfectGoal
                    ? 5
                    : 3.5
            );
        }
    }

    fill(
        18,
        10,
        8,
        alpha * 0.32
    );

    rect(
        0,
        126,
        38,
        13,
        4
    );

    fill(
        dark.r,
        dark.g,
        dark.b,
        alpha * 0.90
    );

    rect(
        0,
        126,
        34,
        9,
        3
    );

    stroke(
        light.r,
        light.g,
        light.b,
        alpha * 0.78
    );

    strokeWidth(1.4);

    line(
        -14,
        128,
        14,
        128
    );

    rectMode(CORNER);

    popMatrix();

    noStroke();
}


function drawResultProductBottle(
    x,
    y,
    scaleValue,
    alpha
) {
    const result =
        gameState.resultData || {};

    const pressure =
        result.pressure ===
        undefined
            ? gameState.glass.pressure
            : result.pressure;

    const pressureRatio =
        CONFIG.pressureMax > 0
            ? Math.max(
                0,
                Math.min(
                    1,
                    pressure /
                    CONFIG.pressureMax
                )
            )
            : 0;

    const sweetness =
        result.sweetness || 0;

    const spice =
        result.spice || 0;

    const strange =
        result.strange || 0;

    const coolingCount =
        result.coolingCount ||
        result.iceCount ||
        0;

    const alphaRatio =
        Math.max(
            0,
            Math.min(
                1,
                alpha / 255
            )
        );

    const geometry = {
        bodyWidth:
            CONFIG.inspectionBottleBodyWidth,
        bodyHeight:
            CONFIG.inspectionBottleBodyHeight,
        neckWidth:
            CONFIG.inspectionBottleNeckWidth,
        neckHeight:
            CONFIG.inspectionBottleNeckHeight,
        mouthWidth:
            CONFIG.inspectionBottleMouthWidth,
        mouthHeight:
            CONFIG.inspectionBottleMouthHeight
    };

    geometry.bodyBottom =
        -geometry.bodyHeight * 0.5 -
        18;

    geometry.bodyTop =
        geometry.bodyHeight * 0.5 -
        18;

    geometry.shoulderY =
        geometry.bodyTop + 7;

    geometry.neckBottom =
        geometry.bodyTop + 17;

    geometry.neckTop =
        geometry.neckBottom +
        geometry.neckHeight;

    const colaR =
        Math.max(
            40,
            Math.min(
                98,
                56 +
                sweetness * 5 +
                strange * 3
            )
        );

    const colaG =
        Math.max(
            20,
            Math.min(
                60,
                26 +
                sweetness * 3 -
                spice * 2
            )
        );

    const colaB =
        Math.max(
            8,
            Math.min(
                30,
                12 +
                strange * 3
            )
        );

    pushMatrix();

    translate(
        x,
        y
    );

    scale(
        scaleValue,
        scaleValue
    );

    rectMode(CENTER);
    ellipseMode(CENTER);
    noStroke();

    fill(
        8,
        5,
        4,
        alpha * 0.38
    );

    ellipse(
        4,
        geometry.bodyBottom - 12,
        geometry.bodyWidth *
            1.32,
        16
    );

    const nativeContext =
        typeof CodeaLite !==
            "undefined" &&
        CodeaLite.state
            ? CodeaLite.state.ctx
            : null;

    if (!nativeContext) {
        popMatrix();
        return;
    }

    const ctx =
        nativeContext;

    ctx.save();

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        -4
    );

    ctx.fillStyle =
        "rgba(5, 3, 2, " +
        String(
            0.36 * alphaRatio
        ) +
        ")";

    ctx.translate(
        5,
        -8
    );

    ctx.fill();

    ctx.restore();

    ctx.save();

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        0
    );

    ctx.fillStyle =
        "rgba(31, 20, 14, " +
        String(
            0.94 * alphaRatio
        ) +
        ")";

    ctx.strokeStyle =
        "rgba(229, 210, 177, " +
        String(
            0.54 * alphaRatio
        ) +
        ")";

    ctx.lineWidth = 2.8;

    ctx.fill();
    ctx.stroke();

    ctx.restore();

    ctx.save();

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        6
    );

    ctx.fillStyle =
        "rgba(92, 57, 31, " +
        String(
            0.28 * alphaRatio
        ) +
        ")";

    ctx.fill();
    ctx.clip();

    const liquidBottom =
        geometry.bodyBottom + 2;

    const liquidTop =
        geometry.neckTop - 18;

    const liquidGradient =
        ctx.createLinearGradient(
            0,
            liquidBottom,
            0,
            liquidTop
        );

    liquidGradient.addColorStop(
        0,
        "rgba(" +
        String(
            Math.max(
                18,
                colaR - 16
            )
        ) +
        "," +
        String(
            Math.max(
                10,
                colaG - 10
            )
        ) +
        "," +
        String(
            Math.max(
                5,
                colaB - 5
            )
        ) +
        "," +
        String(
            0.98 * alphaRatio
        ) +
        ")"
    );

    liquidGradient.addColorStop(
        0.55,
        "rgba(" +
        String(
            colaR
        ) +
        "," +
        String(
            colaG
        ) +
        "," +
        String(
            colaB
        ) +
        "," +
        String(
            0.97 * alphaRatio
        ) +
        ")"
    );

    liquidGradient.addColorStop(
        1,
        "rgba(" +
        String(
            Math.min(
                140,
                colaR + 16
            )
        ) +
        "," +
        String(
            Math.min(
                90,
                colaG + 10
            )
        ) +
        "," +
        String(
            Math.min(
                45,
                colaB + 6
            )
        ) +
        "," +
        String(
            0.92 * alphaRatio
        ) +
        ")"
    );

    ctx.fillStyle =
        liquidGradient;

    ctx.fillRect(
        -geometry.bodyWidth,
        liquidBottom - 6,
        geometry.bodyWidth * 2,
        liquidTop -
            liquidBottom +
            12
    );

    ctx.fillStyle =
        "rgba(255, 243, 216, " +
        String(
            0.08 * alphaRatio
        ) +
        ")";

    ctx.fillRect(
        -geometry.bodyWidth *
            0.35,
        liquidBottom + 8,
        geometry.bodyWidth *
            0.14,
        liquidTop -
            liquidBottom -
            26
    );

    const wave =
        Math.sin(
            ElapsedTime * 2.6
        ) * 2.0;

    ctx.beginPath();

    ctx.moveTo(
        -geometry.bodyWidth,
        liquidTop
    );

    ctx.bezierCurveTo(
        -geometry.bodyWidth *
            0.36,
        liquidTop + wave,
        geometry.bodyWidth *
            0.36,
        liquidTop - wave,
        geometry.bodyWidth,
        liquidTop
    );

    ctx.strokeStyle =
        "rgba(255, 224, 174, " +
        String(
            0.34 * alphaRatio
        ) +
        ")";

    ctx.lineWidth = 1.4;

    ctx.stroke();

    if (pressure > 0) {
        const bubbleCount =
            Math.min(
                16,
                Math.max(
                    4,
                    pressure * 4
                )
            );

        for (
            let index = 0;
            index < bubbleCount;
            index += 1
        ) {
            const bubbleX =
                Math.sin(
                    index * 6.1
                ) *
                geometry.bodyWidth *
                0.26;

            const travel =
                (
                    ElapsedTime * 15 +
                    index * 18
                ) %
                (
                    liquidTop -
                    liquidBottom - 10
                );

            const bubbleY =
                liquidBottom +
                6 +
                travel;

            const bubbleSize =
                2.2 +
                (
                    index % 4
                ) *
                0.75;

            ctx.beginPath();

            ctx.ellipse(
                bubbleX,
                bubbleY,
                bubbleSize * 0.5,
                bubbleSize * 0.5,
                0,
                0,
                Math.PI * 2
            );

            ctx.strokeStyle =
                "rgba(222, 244, 249, " +
                String(
                    (
                        0.34 +
                        pressureRatio *
                            0.28
                    ) *
                        alphaRatio
                ) +
                ")";

            ctx.lineWidth = 1;

            ctx.stroke();
        }
    }

    ctx.restore();

    ctx.save();

    const amberOverlay =
        ctx.createLinearGradient(
            -geometry.bodyWidth *
                0.5,
            0,
            geometry.bodyWidth *
                0.5,
            0
        );

    amberOverlay.addColorStop(
        0,
        "rgba(25, 12, 7, " +
        String(
            0.22 * alphaRatio
        ) +
        ")"
    );

    amberOverlay.addColorStop(
        0.28,
        "rgba(214, 145, 74, " +
        String(
            0.06 * alphaRatio
        ) +
        ")"
    );

    amberOverlay.addColorStop(
        0.72,
        "rgba(90, 43, 20, " +
        String(
            0.04 * alphaRatio
        ) +
        ")"
    );

    amberOverlay.addColorStop(
        1,
        "rgba(17, 8, 5, " +
        String(
            0.30 * alphaRatio
        ) +
        ")"
    );

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        7
    );

    ctx.fillStyle =
        amberOverlay;

    ctx.fill();

    ctx.restore();

    ctx.save();

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        0
    );

    ctx.strokeStyle =
        "rgba(233, 222, 199, " +
        String(
            0.60 * alphaRatio
        ) +
        ")";

    ctx.lineWidth = 2.4;

    ctx.stroke();

    ctx.save();

    traceInspectionBottleVectorPath(
        ctx,
        geometry,
        3
    );

    ctx.clip();

    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";

    ctx.beginPath();

    ctx.moveTo(
        -geometry.bodyWidth *
            0.34,
        geometry.bodyBottom + 24
    );

    ctx.lineTo(
        -geometry.bodyWidth *
            0.31,
        geometry.bodyTop - 28
    );

    ctx.strokeStyle =
        "rgba(255, 247, 225, " +
        String(
            0.20 * alphaRatio
        ) +
        ")";

    ctx.lineWidth = 3.8;

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        -geometry.bodyWidth *
            0.23,
        geometry.bodyBottom + 46
    );

    ctx.lineTo(
        -geometry.bodyWidth *
            0.22,
        geometry.bodyTop + 6
    );

    ctx.strokeStyle =
        "rgba(255, 247, 225, " +
        String(
            0.10 * alphaRatio
        ) +
        ")";

    ctx.lineWidth = 1.8;

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        geometry.bodyWidth *
            0.24,
        geometry.bodyBottom + 18
    );

    ctx.lineTo(
        geometry.bodyWidth *
            0.21,
        geometry.bodyBottom + 58
    );

    ctx.strokeStyle =
        "rgba(255, 235, 202, " +
        String(
            0.07 * alphaRatio
        ) +
        ")";

    ctx.lineWidth = 1.5;

    ctx.stroke();

    ctx.restore();

    ctx.beginPath();

    ctx.ellipse(
        0,
        geometry.neckTop + 7,
        geometry.mouthWidth *
            0.5,
        geometry.mouthHeight *
            0.52,
        0,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "rgba(233, 210, 174, " +
        String(
            0.92 * alphaRatio
        ) +
        ")";

    ctx.fill();

    ctx.strokeStyle =
        "rgba(247, 230, 196, " +
        String(
            0.48 * alphaRatio
        ) +
        ")";

    ctx.lineWidth = 1.2;

    ctx.stroke();

    ctx.beginPath();

    ctx.ellipse(
        0,
        geometry.neckTop + 6.5,
        geometry.mouthWidth *
            0.34,
        geometry.mouthHeight *
            0.24,
        0,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "rgba(21, 12, 9, " +
        String(
            0.90 * alphaRatio
        ) +
        ")";

    ctx.fill();

    if (coolingCount > 0) {
        ctx.save();

        traceInspectionBottleVectorPath(
            ctx,
            geometry,
            1
        );

        ctx.clip();

        ctx.strokeStyle =
            "rgba(211, 239, 247, " +
            String(
                (
                    0.22 +
                    coolingCount * 0.10
                ) * alphaRatio
            ) +
            ")";

        ctx.lineWidth =
            1 +
            coolingCount * 0.28;

        for (
            let index = 0;
            index < 4;
            index += 1
        ) {
            const side =
                index % 2 === 0
                    ? -1
                    : 1;

            const frostX =
                side *
                geometry.bodyWidth *
                0.40;

            const frostY =
                geometry.bodyBottom +
                44 +
                index * 22;

            ctx.beginPath();

            ctx.moveTo(
                frostX - 4,
                frostY
            );

            ctx.lineTo(
                frostX + 4,
                frostY
            );

            ctx.moveTo(
                frostX,
                frostY - 4
            );

            ctx.lineTo(
                frostX,
                frostY + 4
            );

            ctx.stroke();
        }

        ctx.restore();
    }

    ctx.restore();

    rectMode(CORNER);

    popMatrix();
}

function drawResultBottlePresentationBase(
    x,
    y,
    scaleValue,
    alpha
) {
    const bodyWidth =
        CONFIG.inspectionBottleBodyWidth;

    const bodyHeight =
        CONFIG.inspectionBottleBodyHeight;

    const outerSize =
        208 *
        scaleValue;

    const innerSize =
        176 *
        scaleValue;

    const baseY =
        y +
        (
            -bodyHeight * 0.5 -
            26
        ) *
            scaleValue;

    ellipseMode(CENTER);

    noStroke();

    fill(
        35,
        18,
        12,
        alpha * 0.90
    );

    ellipse(
        x,
        y,
        outerSize + 12
    );

    noFill();

    stroke(
        133,
        78,
        35,
        alpha * 0.34
    );

    strokeWidth(2.4);

    ellipse(
        x,
        y,
        outerSize
    );

    stroke(
        226,
        157,
        68,
        alpha * 0.20
    );

    strokeWidth(1.25);

    ellipse(
        x,
        y,
        innerSize
    );

    noStroke();

    fill(
        10,
        6,
        5,
        alpha * 0.34
    );

    ellipse(
        x +
            3 *
                scaleValue,
        baseY -
            2 *
                scaleValue,
        bodyWidth *
            1.72 *
            scaleValue,
        16 *
            scaleValue
    );

    noFill();

    stroke(
        143,
        86,
        41,
        alpha * 0.30
    );

    strokeWidth(1.4);

    ellipse(
        x,
        baseY,
        bodyWidth *
            1.52 *
            scaleValue,
        10 *
            scaleValue
    );

    stroke(
        239,
        181,
        94,
        alpha * 0.16
    );

    strokeWidth(0.9);

    line(
        x -
            bodyWidth *
                0.42 *
                scaleValue,
        baseY +
            1.2 *
                scaleValue,
        x +
            bodyWidth *
                0.42 *
                scaleValue,
        baseY +
            1.2 *
                scaleValue
    );

    noStroke();
}

const drawResultProductBottleBase =
    drawResultProductBottle;

drawResultProductBottle = function(
    x,
    y,
    scaleValue,
    alpha
) {
    drawResultBottlePresentationBase(
        x,
        y,
        scaleValue,
        alpha
    );

    drawResultProductBottleBase(
        x,
        y,
        scaleValue,
        alpha
    );
};



function drawResultTastingSet(
    glassX,
    glassY,
    glassScale,
    crownX,
    crownY,
    crownSize,
    alpha
) {
    const glassKind =
        getResultGlassDrinkKind();

    if (
        glassKind !==
        "none"
    ) {
        fill(
            8,
            5,
            4,
            alpha * 0.34
        );

        noStroke();

        ellipse(
            glassX + 3,
            glassY -
                116 * glassScale,
            116 * glassScale,
            20 * glassScale
        );

        if (
            glassKind ===
            "soda"
        ) {
            drawFinishedSoda(
                glassX,
                glassY,
                glassScale,
                alpha
            );
        } else {
            drawFinishedCola(
                glassX,
                glassY,
                glassScale,
                alpha
            );
        }
    }

    const crownReveal =
        gameState.resultCrownReveal || {
            alpha: 255,
            rotation: 0,
            scale: 1,
            yOffset: 0,
            sparkAlpha: 0,
            sparkScale: 1,
            sparkRotation: 0,
        };

    const crownOpacity =
        Math.max(
            0,
            Math.min(
                1,
                (
                    crownReveal.alpha ||
                    0
                ) / 255
            )
        );

    if (
        crownOpacity <= 0.002
    ) {
        return;
    }

    const nativeContext =
        typeof CodeaLite !==
            "undefined" &&
        CodeaLite.state
            ? CodeaLite.state.ctx
            : null;

    if (!nativeContext) {
        if (
            crownOpacity <
            0.98
        ) {
            return;
        }
    } else {
        nativeContext.save();

        nativeContext.globalAlpha =
            crownOpacity;
    }

    drawResultCrownArrivalSparkles(
        crownX,
        crownY,
        crownSize,
        crownReveal,
        alpha
    );

    pushMatrix();

    translate(
        crownX,
        crownY +
            (
                crownReveal.yOffset || 0
            )
    );

    rotate(
        crownReveal.rotation || 0
    );

    scale(
        crownReveal.scale || 1,
        crownReveal.scale || 1
    );

    translate(
        -crownX,
        -crownY
    );

    if (
        gameState.perfectGoalStop
    ) {
        noFill();

        stroke(
            255,
            215,
            112,
            alpha * 0.58
        );

        strokeWidth(2.2);

        ellipse(
            crownX,
            crownY,
            crownSize * 1.26
        );

        noStroke();
    }

    fill(
        7,
        4,
        3,
        alpha * 0.40
    );

    ellipse(
        crownX + 3,
        crownY -
            crownSize * 0.55,
        crownSize * 1.28,
        crownSize * 0.38
    );

    drawCap(
        crownX,
        crownY,
        -12,
        crownSize
    );

    drawResultCrownSeal(
        crownX,
        crownY,
        crownSize,
        alpha
    );

    popMatrix();

    if (nativeContext) {
        nativeContext.restore();
    }

    noStroke();
}

function drawResultStillGarnishTray(
    glassX,
    glassY,
    glassScale,
    alpha
) {
    const result =
        gameState.resultData || {};

    if (
        !result.garnish ||
        getResultGlassDrinkKind() !==
            "none"
    ) {
        return;
    }

    const portrait =
        HEIGHT > WIDTH;

    const bottleToGlassDistance =
        portrait
            ? WIDTH * 0.265
            : WIDTH * 0.16;

    const bottleX =
        glassX -
        bottleToGlassDistance;

    const bottleScale =
        portrait
            ? Math.min(
                0.78,
                WIDTH / 490
            )
            : Math.min(
                0.78,
                HEIGHT / 520
            );

    const bottleBottomY =
        glassY -
        115 *
            glassScale;

    const dishW =
        Math.max(
            32,
            54 * bottleScale
        );

    const dishH =
        Math.max(
            8,
            12 * bottleScale
        );

    const dishX =
        bottleX -
        50 * bottleScale;

    const dishY =
        bottleBottomY +
        dishH * 0.5;

    const garnishSize =
        result.garnish ===
        "cherry"
            ? 13 * bottleScale
            : 14 * bottleScale;

    noStroke();

    fill(
        8,
        5,
        4,
        alpha * 0.30
    );

    ellipse(
        dishX + 2,
        dishY -
            dishH * 0.54,
        dishW * 0.92,
        dishH * 0.74
    );

    fill(
        36,
        23,
        16,
        alpha * 0.96
    );

    ellipse(
        dishX,
        dishY,
        dishW,
        dishH
    );

    noFill();

    stroke(
        227,
        179,
        105,
        alpha * 0.76
    );

    strokeWidth(
        Math.max(
            1,
            1.35 * bottleScale
        )
    );

    ellipse(
        dishX,
        dishY,
        dishW,
        dishH
    );

    noStroke();

    fill(
        255,
        237,
        198,
        alpha * 0.16
    );

    ellipse(
        dishX -
            dishW * 0.08,
        dishY +
            dishH * 0.12,
        dishW * 0.58,
        dishH * 0.34
    );

    drawGarnishSymbol(
        result.garnish,
        dishX,
        dishY +
            dishH * 0.42,
        garnishSize,
        alpha,
        result.garnish === "cherry"
            ? -16
            : 10
    );

    noStroke();
    rectMode(CORNER);
    ellipseMode(CENTER);
}


const drawResultTastingSetBaseForStillGarnish =
    drawResultTastingSet;

drawResultTastingSet = function(
    glassX,
    glassY,
    glassScale,
    crownX,
    crownY,
    crownSize,
    alpha
) {
    drawResultTastingSetBaseForStillGarnish(
        glassX,
        glassY,
        glassScale,
        crownX,
        crownY,
        crownSize,
        alpha
    );

    drawResultStillGarnishTray(
        glassX,
        glassY,
        glassScale,
        alpha
    );
};



function drawResultCrownArrivalSparkles(
    crownX,
    crownY,
    crownSize,
    crownReveal,
    alpha
) {
    const sparkAlpha =
        Math.max(
            0,
            Math.min(
                255,
                crownReveal.sparkAlpha || 0
            )
        );

    if (sparkAlpha <= 0.5) {
        return;
    }

    const sparkleScale =
        crownReveal.sparkScale ===
        undefined
            ? 1
            : crownReveal.sparkScale;

    const sparkleRotation =
        crownReveal.sparkRotation || 0;

    const centerY =
        crownY +
        (
            crownReveal.yOffset || 0
        );

    pushMatrix();

    translate(
        crownX,
        centerY
    );

    rotate(
        sparkleRotation
    );

    scale(
        sparkleScale,
        sparkleScale
    );

    noFill();

    stroke(
        255,
        223,
        154,
        Math.min(
            alpha,
            sparkAlpha
        ) * 0.32
    );

    strokeWidth(1.5);

    ellipse(
        0,
        0,
        crownSize * 1.42
    );

    for (
        let index = 0;
        index < 6;
        index += 1
    ) {
        pushMatrix();

        rotate(index * 60);

        stroke(
            255,
            231,
            182,
            Math.min(
                alpha,
                sparkAlpha
            ) * 0.82
        );

        strokeWidth(
            index % 2 === 0
                ? 2.2
                : 1.5
        );

        line(
            crownSize * 0.78,
            0,
            crownSize * 1.05,
            0
        );

        popMatrix();
    }

    noStroke();

    fill(
        255,
        236,
        190,
        Math.min(
            alpha,
            sparkAlpha
        ) * 0.86
    );

    ellipse(
        0,
        crownSize * 1.03,
        4
    );

    ellipse(
        crownSize * 0.95,
        -crownSize * 0.35,
        3.2
    );

    ellipse(
        -crownSize * 0.92,
        -crownSize * 0.18,
        2.8
    );

    popMatrix();
}



function getResultCrownSealType() {
    const result =
        gameState.resultData || {};

    if (
        gameState.perfectGoalStop ===
        true
    ) {
        return "star";
    }

    if (
        (
            result.mysteryCount ||
            0
        ) > 0
    ) {
        return "mystery";
    }

    if (
        (
            result.glassFullCount ||
            0
        ) > 0
    ) {
        return "scuff";
    }

    return "none";
}

function drawResultCrownSeal(
    crownX,
    crownY,
    crownSize,
    alpha
) {
    const sealType =
        getResultCrownSealType();

    if (
        sealType ===
        "none"
    ) {
        return;
    }

    const sealRadius =
        crownSize * 0.145;

    pushMatrix();

    translate(
        crownX,
        crownY
    );

    rotate(-12);

    if (
        sealType ===
        "star"
    ) {
        stroke(
            88,
            42,
            25,
            alpha * 0.92
        );

        strokeWidth(
            Math.max(
                1,
                crownSize * 0.042
            )
        );

        for (
            let index = 0;
            index < 5;
            index += 1
        ) {
            const angleA =
                (
                    index * 72 -
                    90
                ) *
                Math.PI /
                180;

            const angleB =
                (
                    (
                        (
                            index +
                            2
                        ) %
                        5
                    ) *
                    72 -
                    90
                ) *
                Math.PI /
                180;

            line(
                Math.cos(
                    angleA
                ) *
                    sealRadius,
                Math.sin(
                    angleA
                ) *
                    sealRadius,
                Math.cos(
                    angleB
                ) *
                    sealRadius,
                Math.sin(
                    angleB
                ) *
                    sealRadius
            );
        }

        stroke(
            255,
            224,
            147,
            alpha * 0.70
        );

        strokeWidth(
            Math.max(
                0.7,
                crownSize * 0.020
            )
        );

        line(
            0,
            -sealRadius * 0.78,
            0,
            sealRadius * 0.78
        );

        line(
            -sealRadius * 0.72,
            0,
            sealRadius * 0.72,
            0
        );
    } else if (
        sealType ===
        "mystery"
    ) {
        let previousX = 0;
        let previousY = 0;

        stroke(
            74,
            39,
            78,
            alpha * 0.92
        );

        strokeWidth(
            Math.max(
                1,
                crownSize * 0.038
            )
        );

        for (
            let index = 0;
            index <= 12;
            index += 1
        ) {
            const ratio =
                index / 12;

            const angle =
                ratio *
                Math.PI *
                2.18;

            const radius =
                sealRadius *
                (
                    0.10 +
                    ratio * 0.96
                );

            const currentX =
                Math.cos(
                    angle
                ) *
                radius;

            const currentY =
                Math.sin(
                    angle
                ) *
                radius;

            if (index > 0) {
                line(
                    previousX,
                    previousY,
                    currentX,
                    currentY
                );
            }

            previousX =
                currentX;

            previousY =
                currentY;
        }

        noStroke();

        fill(
            216,
            165,
            219,
            alpha * 0.56
        );

        ellipse(
            0,
            0,
            Math.max(
                1.4,
                crownSize * 0.052
            )
        );
    } else if (
        sealType ===
        "scuff"
    ) {
        stroke(
            83,
            40,
            24,
            alpha * 0.90
        );

        strokeWidth(
            Math.max(
                1,
                crownSize * 0.050
            )
        );

        line(
            crownSize * 0.16,
            -crownSize * 0.30,
            crownSize * 0.37,
            -crownSize * 0.16
        );

        line(
            crownSize * 0.19,
            -crownSize * 0.18,
            crownSize * 0.39,
            -crownSize * 0.04
        );

        stroke(
            239,
            185,
            103,
            alpha * 0.42
        );

        strokeWidth(
            Math.max(
                0.7,
                crownSize * 0.020
            )
        );

        line(
            crownSize * 0.18,
            -crownSize * 0.32,
            crownSize * 0.35,
            -crownSize * 0.20
        );
    }

    noStroke();

    popMatrix();
}


function getResultGlassDrinkKind() {
    const result =
        gameState.resultData || {};

    const hasFizz =
        result.hasFizz === undefined
            ? (
                (
                    result.pressure || 0
                ) > 0 ||
                (
                    result.carbonationGets || 0
                ) > 0
            )
            : result.hasFizz;

    if (!hasFizz) {
        return "none";
    }

    const drinkType =
        result.drinkType || "cola";

    if (
        drinkType === "plain_soda" ||
        drinkType === "single_soda"
    ) {
        return "soda";
    }

    if (
        drinkType === "scrap" &&
        result.hasColaBase === false
    ) {
        return "soda";
    }

    if (
        drinkType !== "cola" &&
        result.hasColaBase === false
    ) {
        return "soda";
    }

    return "cola";
}


function drawFinishedCola(
    x,
    y,
    scaleValue,
    alpha
) {
    const result =
        gameState.resultData || {};

    const glassH = 230;
    const topW = 130;
    const bottomW = 98;

    const liquidBottom =
        -glassH * 0.44;

    const liquidTop =
        glassH * 0.27;

    const liquidHeight =
        liquidTop -
        liquidBottom;

    const pressure =
        result.pressure ===
        undefined
            ? gameState.glass.pressure
            : result.pressure;

    const pressureRatio =
        CONFIG.pressureMax > 0
            ? Math.max(
                0,
                Math.min(
                    1,
                    pressure /
                        CONFIG.pressureMax
                )
            )
            : 0;

    const iceCount =
        result.iceCount || 0;

    const coldLevel =
        result.chillLevel ===
            "high" ||
        iceCount >= 2
            ? 1
            : iceCount > 0
                ? 0.55
                : 0.25;

    const featureIds =
        getFinishedColaFeatureIds();

    pushMatrix();

    translate(
        x,
        y
    );

    scale(
        scaleValue,
        scaleValue
    );

    rectMode(CENTER);
    noStroke();

    fill(
        17,
        9,
        7,
        alpha * 0.42
    );

    rect(
        0,
        -2,
        topW * 0.82,
        glassH * 0.92,
        16
    );

    const bandCount = 18;

    const bandHeight =
        liquidHeight /
        bandCount +
        1.2;

    for (
        let index = 0;
        index < bandCount;
        index += 1
    ) {
        const ratio =
            (
                index +
                0.5
            ) /
            bandCount;

        const bandY =
            liquidBottom +
            liquidHeight *
                ratio;

        const glassRatio =
            (
                bandY +
                glassH * 0.5
            ) /
            glassH;

        const bandW =
            bottomW +
            (
                topW -
                bottomW
            ) *
                glassRatio -
            12;

        fill(
            45 +
                ratio * 36,
            19 +
                ratio * 23,
            8 +
                ratio * 8,
            alpha * 0.98
        );

        rect(
            0,
            bandY,
            bandW,
            bandHeight,
            3
        );

        fill(
            19,
            8,
            5,
            alpha * 0.22
        );

        rect(
            -bandW * 0.30,
            bandY,
            bandW * 0.22,
            bandHeight,
            2
        );

        fill(
            205,
            112,
            31,
            alpha *
                (
                    0.04 +
                    ratio * 0.08
                )
        );

        rect(
            bandW * 0.27,
            bandY,
            bandW * 0.14,
            bandHeight,
            2
        );
    }

    drawFinishedColaBubbles(
        liquidBottom,
        liquidTop,
        topW,
        bottomW,
        glassH,
        pressureRatio,
        alpha
    );

    drawFinishedColaIce(
        liquidTop,
        iceCount,
        coldLevel,
        alpha
    );

    fill(
        128,
        71,
        23,
        alpha * 0.98
    );

    ellipse(
        0,
        liquidTop,
        topW * 0.84,
        17
    );

    fill(
        63,
        30,
        12,
        alpha * 0.92
    );

    ellipse(
        0,
        liquidTop + 1,
        topW * 0.70,
        10
    );

    drawFinishedColaFoam(
        liquidTop,
        pressureRatio,
        alpha
    );

    for (
        let index = 0;
        index <
            featureIds.length;
        index += 1
    ) {
        drawFinishedColaFeature(
            featureIds[index],
            index,
            liquidTop,
            topW,
            glassH,
            alpha
        );
    }

    stroke(
        245,
        238,
        228,
        alpha * 0.52
    );

    strokeWidth(4);

    line(
        -topW * 0.5,
        glassH * 0.5,
        -bottomW * 0.5,
        -glassH * 0.5
    );

    line(
        topW * 0.5,
        glassH * 0.5,
        bottomW * 0.5,
        -glassH * 0.5
    );

    line(
        -bottomW * 0.5,
        -glassH * 0.5,
        bottomW * 0.5,
        -glassH * 0.5
    );

    noFill();

    stroke(
        255,
        248,
        235,
        alpha * 0.24
    );

    strokeWidth(2);

    ellipse(
        0,
        glassH * 0.5,
        topW,
        14
    );

    stroke(
        255,
        255,
        255,
        alpha * 0.17
    );

    strokeWidth(3);

    line(
        -topW * 0.27,
        glassH * 0.40,
        -bottomW * 0.20,
        -glassH * 0.37
    );

    stroke(
        255,
        255,
        255,
        alpha * 0.08
    );

    strokeWidth(2);

    line(
        -topW * 0.18,
        glassH * 0.30,
        -bottomW * 0.12,
        -glassH * 0.25
    );

    noStroke();

    drawFinishedColaCondensation(
        coldLevel,
        glassH,
        topW,
        alpha
    );

    rectMode(CORNER);
    popMatrix();
}

function drawFinishedSoda(
    x,
    y,
    scaleValue,
    alpha
) {
    const result =
        gameState.resultData || {};

    const glassH = 230;
    const topW = 130;
    const bottomW = 98;

    const liquidBottom =
        -glassH * 0.44;

    const liquidTop =
        glassH * 0.27;

    const liquidHeight =
        liquidTop -
        liquidBottom;

    const pressure =
        result.pressure ===
            undefined
            ? gameState.glass.pressure
            : result.pressure;

    const pressureRatio =
        CONFIG.pressureMax > 0
            ? Math.max(
                0,
                Math.min(
                    1,
                    pressure /
                        CONFIG.pressureMax
                )
            )
            : 0;

    const iceCount =
        result.iceCount || 0;

    const coldLevel =
        result.chillLevel ===
            "high" ||
        iceCount >= 2
            ? 1
            : iceCount > 0
                ? 0.55
                : 0.25;

    const featureIds =
        getFinishedColaFeatureIds();

    pushMatrix();

    translate(
        x,
        y
    );

    scale(
        scaleValue,
        scaleValue
    );

    rectMode(CENTER);
    noStroke();

    fill(
        12,
        16,
        18,
        alpha * 0.24
    );

    rect(
        0,
        -2,
        topW * 0.82,
        glassH * 0.92,
        16
    );

    const bandCount = 15;

    const bandHeight =
        liquidHeight /
        bandCount +
        1.2;

    for (
        let index = 0;
        index < bandCount;
        index += 1
    ) {
        const ratio =
            (
                index +
                0.5
            ) /
            bandCount;

        const bandY =
            liquidBottom +
            liquidHeight *
                ratio;

        const glassRatio =
            (
                bandY +
                glassH * 0.5
            ) /
            glassH;

        const bandW =
            bottomW +
            (
                topW -
                bottomW
            ) *
                glassRatio -
            12;

        fill(
            178 +
                ratio * 22,
            222 +
                ratio * 16,
            235 +
                ratio * 15,
            alpha *
                (
                    0.18 +
                    pressureRatio * 0.08
                )
        );

        rect(
            0,
            bandY,
            bandW,
            bandHeight,
            3
        );

        fill(
            255,
            255,
            255,
            alpha * 0.07
        );

        rect(
            -bandW * 0.28,
            bandY,
            bandW * 0.20,
            bandHeight,
            2
        );
    }

    drawFinishedColaBubbles(
        liquidBottom,
        liquidTop,
        topW,
        bottomW,
        glassH,
        Math.max(
            0.42,
            pressureRatio
        ),
        alpha
    );

    drawFinishedColaIce(
        liquidTop,
        iceCount,
        coldLevel,
        alpha
    );

    fill(
        209,
        238,
        244,
        alpha * 0.40
    );

    ellipse(
        0,
        liquidTop,
        topW * 0.84,
        17
    );

    fill(
        245,
        255,
        255,
        alpha * 0.30
    );

    ellipse(
        0,
        liquidTop + 1,
        topW * 0.70,
        10
    );

    noFill();

    stroke(
        232,
        251,
        255,
        alpha *
            (
                0.22 +
                pressureRatio * 0.20
            )
    );

    strokeWidth(1.3);

    ellipse(
        0,
        liquidTop + 1,
        topW * 0.62,
        8
    );

    noStroke();

    for (
        let index = 0;
        index <
            featureIds.length;
        index += 1
    ) {
        drawFinishedColaFeature(
            featureIds[index],
            index,
            liquidTop,
            topW,
            glassH,
            alpha
        );
    }

    stroke(
        245,
        238,
        228,
        alpha * 0.52
    );

    strokeWidth(4);

    line(
        -topW * 0.5,
        glassH * 0.5,
        -bottomW * 0.5,
        -glassH * 0.5
    );

    line(
        topW * 0.5,
        glassH * 0.5,
        bottomW * 0.5,
        -glassH * 0.5
    );

    line(
        -bottomW * 0.5,
        -glassH * 0.5,
        bottomW * 0.5,
        -glassH * 0.5
    );

    noFill();

    stroke(
        255,
        248,
        235,
        alpha * 0.24
    );

    strokeWidth(2);

    ellipse(
        0,
        glassH * 0.5,
        topW,
        14
    );

    stroke(
        255,
        255,
        255,
        alpha * 0.22
    );

    strokeWidth(3);

    line(
        -topW * 0.27,
        glassH * 0.40,
        -bottomW * 0.20,
        -glassH * 0.37
    );

    stroke(
        255,
        255,
        255,
        alpha * 0.11
    );

    strokeWidth(2);

    line(
        -topW * 0.18,
        glassH * 0.30,
        -bottomW * 0.12,
        -glassH * 0.25
    );

    noStroke();

    drawFinishedColaCondensation(
        coldLevel,
        glassH,
        topW,
        alpha
    );

    rectMode(CORNER);
    popMatrix();
}


function getFinishedColaFeatureIds() {
    const result =
        gameState.resultData || {};

    const features = [];

    if (
        result.garnish ===
        "lemon"
    ) {
        features.push(
            "lemon"
        );
    } else if (
        result.garnish ===
        "cherry"
    ) {
        features.push(
            "cherry"
        );
    }

    const counts =
        result.ingredientCounts ||
        {};

    const candidates = [
        "secret_syrup",
        "lemon_peel",
        "herb",
        "cinnamon",
        "ginger",
        "vanilla",
        "caramel",
        "brown_sugar",
        "thick_syrup"
    ];

    candidates.sort(
        function(a, b) {
            const countA =
                counts[a] || 0;

            const countB =
                counts[b] || 0;

            if (
                countA !==
                countB
            ) {
                return (
                    countB -
                    countA
                );
            }

            return 0;
        }
    );

    for (
        const candidate of
        candidates
    ) {
        if (
            features.length >= 2
        ) {
            break;
        }

        if (
            (
                counts[candidate] ||
                0
            ) <= 0
        ) {
            continue;
        }

        if (
            candidate ===
                "lemon_peel" &&
            features.indexOf(
                "lemon"
            ) >= 0
        ) {
            continue;
        }

        features.push(
            candidate
        );
    }

    if (
        features.length === 0 &&
        result.topIngredientId &&
        result.topIngredientId !==
            "base_syrup" &&
        result.topIngredientId !==
            "ice"
    ) {
        features.push(
            result.topIngredientId
        );
    }

    return features.slice(
        0,
        2
    );
}

function drawFinishedColaBubbles(
    liquidBottom,
    liquidTop,
    topW,
    bottomW,
    glassH,
    pressureRatio,
    alpha
) {
    const bubbleCount =
        7 +
        Math.floor(
            pressureRatio * 17
        );

    noFill();

    stroke(
        225,
        241,
        232,
        alpha *
            (
                0.20 +
                pressureRatio *
                    0.28
            )
    );

    strokeWidth(1.5);

    for (
        let index = 0;
        index < bubbleCount;
        index += 1
    ) {
        const travel =
            (
                ElapsedTime *
                    (
                        0.18 +
                        pressureRatio *
                            0.16
                    ) +
                index *
                    0.137
            ) %
            1;

        const bubbleY =
            liquidBottom +
            (
                liquidTop -
                liquidBottom
            ) *
                travel;

        const glassRatio =
            (
                bubbleY +
                glassH * 0.5
            ) /
            glassH;

        const currentW =
            bottomW +
            (
                topW -
                bottomW
            ) *
                glassRatio -
            20;

        const bubbleX =
            Math.sin(
                index * 7.31 +
                ElapsedTime *
                    0.7
            ) *
            currentW *
            0.42;

        const size =
            2.5 +
            (
                index %
                4
            ) *
            1.1;

        ellipse(
            bubbleX,
            bubbleY,
            size
        );
    }

    noStroke();
}

function drawFinishedColaIce(
    liquidTop,
    iceCount,
    coldLevel,
    alpha
) {
    const visibleCount =
        Math.max(
            2,
            Math.min(
                5,
                2 +
                    Math.max(
                        iceCount,
                        Math.round(
                            coldLevel * 2
                        )
                    )
            )
        );

    const positions = [
        {
            x: -29,
            y: liquidTop - 10,
            r: -14,
            s: 25,
        },
        {
            x: 8,
            y: liquidTop - 18,
            r: 16,
            s: 27,
        },
        {
            x: 33,
            y: liquidTop - 5,
            r: -8,
            s: 23,
        },
        {
            x: -6,
            y: liquidTop + 5,
            r: 27,
            s: 21,
        },
        {
            x: -42,
            y: liquidTop + 4,
            r: 11,
            s: 19,
        },
    ];

    rectMode(CENTER);

    for (
        let index = 0;
        index < visibleCount;
        index += 1
    ) {
        const position =
            positions[index];

        pushMatrix();

        translate(
            position.x,
            position.y
        );

        rotate(
            position.r
        );

        fill(
            185,
            224,
            235,
            alpha *
                (
                    0.54 +
                    coldLevel *
                        0.20
                )
        );

        stroke(
            235,
            250,
            252,
            alpha * 0.52
        );

        strokeWidth(2);

        rect(
            0,
            0,
            position.s,
            position.s,
            5
        );

        noStroke();

        fill(
            255,
            255,
            255,
            alpha * 0.28
        );

        rect(
            -position.s * 0.14,
            position.s * 0.15,
            position.s * 0.38,
            position.s * 0.15,
            2
        );

        popMatrix();
    }

    rectMode(CORNER);
}

function drawFinishedColaFoam(
    liquidTop,
    pressureRatio,
    alpha
) {
    const foamCount =
        5 +
        Math.floor(
            pressureRatio * 7
        );

    noStroke();

    for (
        let index = 0;
        index < foamCount;
        index += 1
    ) {
        const ratio =
            foamCount <= 1
                ? 0.5
                : index /
                    (
                        foamCount -
                        1
                    );

        const foamX =
            -43 +
            ratio * 86;

        const foamY =
            liquidTop +
            Math.sin(
                index * 2.7
            ) *
            2;

        const foamSize =
            4 +
            (
                index %
                3
            ) *
            1.8;

        fill(
            237,
            224,
            188,
            alpha *
                (
                    0.28 +
                    pressureRatio *
                        0.34
                )
        );

        ellipse(
            foamX,
            foamY,
            foamSize
        );
    }
}

function drawFinishedColaFeature(
    featureId,
    featureIndex,
    liquidTop,
    topW,
    glassH,
    alpha
) {
    const side =
        featureIndex === 0
            ? -1
            : 1;

    if (
        featureId === "lemon" ||
        featureId === "lemon_peel"
    ) {
        const x =
            side *
            topW *
            0.39;

        const y =
            glassH *
            0.48;

        fill(
            239,
            221,
            70,
            alpha
        );

        noStroke();

        ellipse(
            x,
            y,
            30
        );

        fill(
            44,
            31,
            20,
            alpha
        );

        ellipse(
            x +
                side * 7,
            y - 5,
            23
        );

        stroke(
            255,
            246,
            156,
            alpha * 0.72
        );

        strokeWidth(2);

        line(
            x -
                side * 10,
            y,
            x +
                side * 7,
            y
        );

        noStroke();

        return;
    }

    if (featureId === "cherry") {
        const x =
            side *
            19;

        const y =
            liquidTop + 9;

        stroke(
            87,
            123,
            70,
            alpha
        );

        strokeWidth(2);

        line(
            x,
            y + 5,
            x +
                side * 9,
            y + 27
        );

        noStroke();

        fill(
            184,
            31,
            43,
            alpha
        );

        ellipse(
            x,
            y,
            20
        );

        fill(
            255,
            159,
            157,
            alpha * 0.70
        );

        ellipse(
            x -
                4,
            y + 4,
            5
        );

        return;
    }

    if (featureId === "herb") {
        const x =
            side *
            23;

        const y =
            liquidTop + 8;

        stroke(
            68,
            113,
            58,
            alpha
        );

        strokeWidth(2);

        line(
            x -
                side * 5,
            y - 8,
            x +
                side * 8,
            y + 18
        );

        noStroke();

        fill(
            68,
            133,
            67,
            alpha
        );

        pushMatrix();

        translate(
            x -
                side * 2,
            y + 1
        );

        rotate(
            side * -28
        );

        ellipse(
            0,
            0,
            20,
            9
        );

        popMatrix();

        pushMatrix();

        translate(
            x +
                side * 6,
            y + 10
        );

        rotate(
            side * 28
        );

        ellipse(
            0,
            0,
            18,
            8
        );

        popMatrix();

        return;
    }

    if (featureId === "cinnamon") {
        rectMode(CENTER);

        fill(
            145,
            68,
            29,
            alpha
        );

        pushMatrix();

        translate(
            side * 12,
            liquidTop + 8
        );

        rotate(
            side * 56
        );

        rect(
            0,
            0,
            8,
            47,
            4
        );

        fill(
            210,
            127,
            64,
            alpha * 0.72
        );

        rect(
            -2,
            0,
            2,
            39,
            1
        );

        popMatrix();

        rectMode(CORNER);

        return;
    }

    if (featureId === "ginger") {
        fill(
            225,
            194,
            103,
            alpha
        );

        ellipse(
            side * 18,
            liquidTop + 3,
            22,
            12
        );

        ellipse(
            side * 31,
            liquidTop + 8,
            18,
            10
        );

        noFill();

        stroke(
            255,
            225,
            145,
            alpha * 0.60
        );

        strokeWidth(1.5);

        ellipse(
            side * 18,
            liquidTop + 3,
            14,
            7
        );

        noStroke();

        return;
    }

    if (featureId === "vanilla") {
        noFill();

        stroke(
            249,
            238,
            194,
            alpha * 0.66
        );

        strokeWidth(3);

        ellipse(
            side * 12,
            liquidTop + 1,
            32,
            9
        );

        ellipse(
            side * 12,
            liquidTop + 1,
            20,
            6
        );

        noStroke();

        return;
    }

    if (
        featureId === "caramel" ||
        featureId === "brown_sugar" ||
        featureId === "thick_syrup"
    ) {
        noFill();

        stroke(
            224,
            142,
            52,
            alpha * 0.72
        );

        strokeWidth(4);

        ellipse(
            side * 12,
            liquidTop + 1,
            36,
            9
        );

        stroke(
            250,
            190,
            91,
            alpha * 0.42
        );

        strokeWidth(2);

        ellipse(
            side * 12,
            liquidTop + 1,
            20,
            5
        );

        noStroke();

        return;
    }

    if (featureId === "secret_syrup") {
        fill(
            160,
            94,
            176,
            alpha * 0.72
        );

        ellipse(
            side * 18,
            liquidTop + 7,
            10
        );

        ellipse(
            side * 31,
            liquidTop + 1,
            6
        );

        pushMatrix();

        translate(
            side * 11,
            liquidTop + 18
        );

        rotate(45);

        rectMode(CENTER);

        fill(
            225,
            170,
            235,
            alpha * 0.72
        );

        rect(
            0,
            0,
            7,
            7,
            1
        );

        rectMode(CORNER);

        popMatrix();
    }
}

function drawFinishedColaCondensation(
    coldLevel,
    glassH,
    topW,
    alpha
) {
    const dropletCount =
        3 +
        Math.floor(
            coldLevel * 5
        );

    const positions = [
        {
            x: -48,
            y: 48,
            s: 5,
        },
        {
            x: 47,
            y: 26,
            s: 4,
        },
        {
            x: -43,
            y: -5,
            s: 3,
        },
        {
            x: 42,
            y: -28,
            s: 6,
        },
        {
            x: -35,
            y: -53,
            s: 4,
        },
        {
            x: 36,
            y: 63,
            s: 3,
        },
        {
            x: -51,
            y: 78,
            s: 4,
        },
        {
            x: 48,
            y: -70,
            s: 3,
        },
    ];

    noFill();

    stroke(
        205,
        235,
        243,
        alpha *
            (
                0.20 +
                coldLevel *
                    0.28
            )
    );

    strokeWidth(1.5);

    for (
        let index = 0;
        index < dropletCount;
        index += 1
    ) {
        const position =
            positions[index];

        ellipse(
            position.x,
            position.y,
            position.s,
            position.s * 1.35
        );

        if (
            index % 3 === 1
        ) {
            line(
                position.x,
                position.y -
                    position.s,
                position.x -
                    1,
                position.y -
                    position.s -
                    5
            );
        }
    }

    noStroke();
}


function splitResultDescription(
    value,
    maxLength
) {
    setGameUIFont();

    const rawValue =
        String(
            value ||
            ""
        );

    if (
        rawValue.trim() === ""
    ) {
        return [
            "",
        ];
    }

    const portrait =
        HEIGHT > WIDTH;

    const isJapanese =
        gameState.language ===
        "ja";

    const textValue =
        isJapanese
            ? rawValue.replace(
                /\s+/g,
                ""
            )
            : rawValue.replace(
                /\s+/g,
                " "
            ).trim();

    const lineLength =
        isJapanese
            ? Math.max(
                16,
                Math.floor(
                    maxLength *
                    (
                        portrait
                            ? 0.80
                            : 0.90
                    )
                )
            )
            : maxLength;

    if (
        textValue.length <=
        lineLength
    ) {
        return [
            textValue,
        ];
    }

    if (isJapanese) {
        const lines = [];
        const noLineStart =
            "、。！？）］｝〉》」』】";
        const noLineEnd =
            "（［｛〈《「『【";

        let startIndex =
            0;

        while (
            startIndex <
            textValue.length
        ) {
            let endIndex =
                Math.min(
                    textValue.length,
                    startIndex +
                        lineLength
                );

            while (
                endIndex <
                    textValue.length &&
                noLineStart.indexOf(
                    textValue.charAt(
                        endIndex
                    )
                ) >= 0
            ) {
                endIndex += 1;
            }

            while (
                endIndex >
                    startIndex + 1 &&
                noLineEnd.indexOf(
                    textValue.charAt(
                        endIndex - 1
                    )
                ) >= 0
            ) {
                endIndex -= 1;
            }

            if (
                endIndex <=
                startIndex
            ) {
                endIndex =
                    Math.min(
                        textValue.length,
                        startIndex +
                            lineLength
                    );
            }

            lines.push(
                textValue.slice(
                    startIndex,
                    endIndex
                )
            );

            startIndex =
                endIndex;
        }

        return lines;
    }

    const words =
        textValue.split(
            " "
        );

    const lines = [];
    let currentLine =
        "";

    for (
        const word of words
    ) {
        const nextLine =
            currentLine === ""
                ? word
                : currentLine +
                    " " +
                    word;

        if (
            nextLine.length >
                lineLength &&
            currentLine !== ""
        ) {
            lines.push(
                currentLine
            );

            currentLine =
                word;
        } else {
            currentLine =
                nextLine;
        }
    }

    if (
        currentLine !== ""
    ) {
        lines.push(
            currentLine
        );
    }

    return lines;
}




function drawResultIngredientRibbon(
    centerX,
    y,
    width,
    alpha
) {
    updateResultIngredientTooltip();

    const items =
        getResultIngredientRibbonLayout(
            centerX,
            y,
            width
        );

    const tooltip =
        gameState.resultIngredientTooltip;

    if (items.length > 0) {
        const firstX =
            items[0].x;

        const lastX =
            items[
                items.length - 1
            ].x;

        const ribbonCenterX =
            (
                firstX +
                lastX
            ) * 0.5;

        const ribbonWidth =
            Math.max(
                72,
                (
                    lastX - firstX
                ) + 56
            );

        rectMode(CENTER);
        noStroke();

        fill(
            30,
            18,
            15,
            alpha * 0.16
        );

        rect(
            ribbonCenterX,
            y,
            ribbonWidth,
            18,
            9
        );

        noFill();

        stroke(
            174,
            102,
            49,
            alpha * 0.24
        );

        strokeWidth(1.1);

        line(
            firstX - 18,
            y,
            lastX + 18,
            y
        );

        if (
            items.length >= 2
        ) {
            for (
                let index = 0;
                index <
                    items.length - 1;
                index += 1
            ) {
                const current =
                    items[index];

                const next =
                    items[
                        index + 1
                    ];

                stroke(
                    230,
                    182,
                    110,
                    alpha * 0.10
                );

                strokeWidth(0.9);

                line(
                    current.x + 16,
                    y,
                    next.x - 16,
                    y
                );
            }
        }

        noStroke();

        fill(
            224,
            167,
            85,
            alpha * 0.34
        );

        ellipse(
            firstX - 22,
            y,
            3.2
        );

        ellipse(
            lastX + 22,
            y,
            3.2
        );

        rectMode(CORNER);
    }

    for (
        let index = 0;
        index < items.length;
        index += 1
    ) {
        const item =
            items[index];

        const ingredient =
            item.ingredient;

        const selected =
            tooltip &&
            tooltip.visible &&
            tooltip.slotIndex ===
                item.slotIndex;

        const iconSize =
            selected
                ? 15.5
                : 14;

        if (selected) {
            noFill();

            stroke(
                255,
                225,
                159,
                alpha *
                    Math.max(
                        0,
                        tooltip.alpha
                    ) *
                    0.82
            );

            strokeWidth(2);

            ellipse(
                item.x,
                item.y,
                36
            );

            noStroke();
        }

        fill(
            ingredient.color.r,
            ingredient.color.g,
            ingredient.color.b,
            alpha *
                (
                    selected
                        ? 0.42
                        : 0.26
                )
        );

        ellipse(
            item.x,
            item.y,
            selected
                ? 31
                : 28
        );

        noFill();

        stroke(
            247,
            220,
            175,
            alpha *
                (
                    selected
                        ? 0.72
                        : 0.36
                )
        );

        strokeWidth(
            selected
                ? 1.8
                : 1.2
        );

        ellipse(
            item.x,
            item.y,
            selected
                ? 31
                : 28
        );

        noStroke();

        drawIngredientIcon(
            item.ingredientId,
            item.x,
            item.y,
            iconSize,
            alpha *
                (
                    selected
                        ? 1
                        : 0.78
                )
        );
    }

    drawResultIngredientTooltip(
        alpha
    );
}


function getResultIngredientRibbonLayout(
    centerX,
    y,
    width
) {
    const slots =
        gameState &&
        gameState.glass &&
        gameState.glass.slots
            ? gameState.glass.slots
            : [];

    const items = [];

    if (slots.length <= 0) {
        return items;
    }

    const gap =
        Math.min(
            42,
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
        index < slots.length;
        index += 1
    ) {
        const token =
            slots[index];

        if (!token) {
            continue;
        }

        const ingredient =
            INGREDIENTS[
                token.ingredientId
            ];

        if (!ingredient) {
            continue;
        }

        items.push(
            {
                slotIndex: index,
                ingredientId:
                    token.ingredientId,
                ingredient: ingredient,
                x:
                    startX +
                    gap * index,
                y: y,
            }
        );
    }

    return items;
}

function getResultIngredientRibbonScreenLayout() {
    const portrait =
        HEIGHT > WIDTH;

    return {
        centerX:
            portrait
                ? WIDTH * 0.5
                : WIDTH * 0.72,

        y:
            portrait
                ? HEIGHT * 0.176
                : HEIGHT * 0.255,

        width:
            portrait
                ? WIDTH - 54
                : WIDTH * 0.48,
    };
}


function getResultIngredientHitAt(
    touchX,
    touchY
) {
    const ribbonLayout =
        getResultIngredientRibbonScreenLayout();

    const items =
        getResultIngredientRibbonLayout(
            ribbonLayout.centerX,
            ribbonLayout.y,
            ribbonLayout.width
        );

    const hitRadius =
        24;

    for (
        let index =
            items.length - 1;
        index >= 0;
        index -= 1
    ) {
        const item =
            items[index];

        const dx =
            touchX -
            item.x;

        const dy =
            touchY -
            item.y;

        if (
            dx * dx +
                dy * dy <=
            hitRadius * hitRadius
        ) {
            return item;
        }
    }

    return null;
}

function showResultIngredientTooltip(
    item
) {
    if (
        !item ||
        !item.ingredient
    ) {
        return;
    }

    gameState.resultIngredientTooltip =
        {
            visible: true,
            ingredientId:
                item.ingredientId,
            slotIndex:
                item.slotIndex,
            x: item.x,
            y: item.y,
            elapsed: 0,
            alpha: 0,
            rise: 0,
            scale: 0.92,
        };
}

function updateResultIngredientTooltip() {
    const tooltip =
        gameState.resultIngredientTooltip;

    if (
        !tooltip ||
        !tooltip.visible
    ) {
        return;
    }

    const ingredient =
        INGREDIENTS[
            tooltip.ingredientId
        ];

    if (!ingredient) {
        gameState.resultIngredientTooltip =
            null;

        return;
    }

    const fadeInDuration =
        0.16;

    const holdDuration =
        0.92;

    const fadeOutDuration =
        0.30;

    const totalDuration =
        fadeInDuration +
        holdDuration +
        fadeOutDuration;

    const delta =
        typeof DeltaTime !==
        "undefined"
            ? Math.max(
                0,
                Math.min(
                    0.05,
                    DeltaTime
                )
            )
            : 0.016;

    tooltip.elapsed +=
        delta;

    if (
        tooltip.elapsed >=
        totalDuration
    ) {
        gameState.resultIngredientTooltip =
            null;

        return;
    }

    let alpha =
        1;

    let riseProgress =
        1;

    let scale =
        1;

    if (
        tooltip.elapsed <
        fadeInDuration
    ) {
        const t =
            tooltip.elapsed /
            fadeInDuration;

        const eased =
            1 -
            Math.pow(
                1 - t,
                2
            );

        alpha =
            eased;

        riseProgress =
            eased;

        scale =
            0.92 +
            0.08 * eased;
    } else if (
        tooltip.elapsed >
        fadeInDuration +
            holdDuration
    ) {
        const t =
            (
                tooltip.elapsed -
                fadeInDuration -
                holdDuration
            ) /
            fadeOutDuration;

        const eased =
            Math.max(
                0,
                Math.min(
                    1,
                    t
                )
            );

        alpha =
            1 -
            eased;

        riseProgress =
            1 +
            eased * 0.22;

        scale =
            1 -
            eased * 0.05;
    }

    tooltip.alpha =
        alpha;

    tooltip.rise =
        17 * riseProgress;

    tooltip.scale =
        scale;
}

function drawResultIngredientTooltip(
    resultAlpha
) {
    const tooltip =
        gameState.resultIngredientTooltip;

    if (
        !tooltip ||
        !tooltip.visible ||
        tooltip.alpha <= 0
    ) {
        return;
    }

    const ingredient =
        INGREDIENTS[
            tooltip.ingredientId
        ];

    if (!ingredient) {
        return;
    }

    const label =
        ingredient[
            gameState.language
        ] ||
        ingredient.ja ||
        ingredient.en ||
        "";

    if (label === "") {
        return;
    }

    const alpha =
        resultAlpha *
        tooltip.alpha;

    const fontSizeValue =
        Math.min(
            14,
            Math.max(
                11,
                WIDTH * 0.033
            )
        );

    const labelWidth =
        Math.max(
            58,
            Math.min(
                154,
                24 +
                    label.length *
                        fontSizeValue *
                        0.92
            )
        );

    const labelHeight =
        27;

    const ribbonLayout =
        getResultIngredientRibbonScreenLayout();

    const minX =
        ribbonLayout.centerX -
        ribbonLayout.width *
            0.5 +
        labelWidth *
            0.5;

    const maxX =
        ribbonLayout.centerX +
        ribbonLayout.width *
            0.5 -
        labelWidth *
            0.5;

    const labelX =
        Math.max(
            minX,
            Math.min(
                maxX,
                tooltip.x
            )
        );

    const labelY =
        tooltip.y +
        22 +
        tooltip.rise * 0.20;

    pushMatrix();

    translate(
        labelX,
        labelY
    );

    scale(
        tooltip.scale,
        tooltip.scale
    );

    noStroke();

    fill(
        32,
        20,
        16,
        alpha * 0.92
    );

    rectMode(CENTER);

    rect(
        0,
        0,
        labelWidth,
        labelHeight,
        8
    );

    noFill();

    stroke(
        ingredient.color.r,
        ingredient.color.g,
        ingredient.color.b,
        alpha * 0.72
    );

    strokeWidth(1.2);

    rect(
        0,
        0,
        labelWidth,
        labelHeight,
        8
    );

    noStroke();

    fill(
        255,
        232,
        185,
        alpha
    );

    fontSize(
        fontSizeValue
    );

    textAlign(CENTER);

    text(
        label,
        0,
        -1
    );

    rectMode(CORNER);

    popMatrix();
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
        width * 0.5;

    const carbonationCount =
        result.carbonationGets ||
        0;

    const coolingCount =
        result.coolingCount ||
        0;

    const labels =
        gameState.language === "ja"
            ? [
                "炭酸 ×" +
                    String(
                        carbonationCount
                    ),
                "冷却 ×" +
                    String(
                        coolingCount
                    ),
            ]
            : [
                "FIZZ ×" +
                    String(
                        carbonationCount
                    ),
                "CHILL ×" +
                    String(
                        coolingCount
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
        centerX,
        y - 15,
        centerX,
        y + 15
    );

    noStroke();

    for (
        let index = 0;
        index < 2;
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

        const isFizz =
            index === 0;

        fill(
            isFizz
                ? 235
                : 190,
            isFizz
                ? 182
                : 223,
            isFizz
                ? 102
                : 229,
            alpha
        );

        fontSize(
            Math.min(
                14,
                width / 18
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
    setGameTitleFont();

    if (
        gameState.language === "ja"
    ) {
        const buildJapaneseResultLines = function(
            prefix,
            suffix
        ) {
            if (prefix === "") {
                return [
                    suffix,
                ];
            }

            const phraseBreaks = [
                "チェリー浮かぶ",
                "レモン添えの",
            ];

            for (
                const phrase of phraseBreaks
            ) {
                const phraseIndex =
                    prefix.indexOf(
                        phrase
                    );

                if (
                    phraseIndex > 0
                ) {
                    const before =
                        prefix.slice(
                            0,
                            phraseIndex
                        );

                    const after =
                        prefix.slice(
                            phraseIndex
                        );

                    if (
                        before.length <= 13 &&
                        after.length <= 10
                    ) {
                        return [
                            before,
                            after,
                            suffix,
                        ];
                    }
                }
            }

            const particleIndex =
                prefix.lastIndexOf(
                    "の"
                );

            if (
                particleIndex > 0 &&
                particleIndex <
                    prefix.length - 1
            ) {
                const before =
                    prefix.slice(
                        0,
                        particleIndex + 1
                    );

                const after =
                    prefix.slice(
                        particleIndex + 1
                    );

                if (
                    before.length <= 13 &&
                    after.length <= 10
                ) {
                    return [
                        before,
                        after,
                        suffix,
                    ];
                }
            }

            if (
                prefix.length <= 11
            ) {
                return [
                    prefix,
                    suffix,
                ];
            }

            const preferredBreaks = [
                "シロップ",
                "キャラメル",
                "ジンジャー",
                "シナモン",
                "レモン",
                "バニラ",
                "ハーブ",
                "砂糖",
            ];

            for (
                const word of preferredBreaks
            ) {
                const wordIndex =
                    prefix.indexOf(
                        word
                    );

                if (
                    wordIndex >= 0
                ) {
                    const cutIndex =
                        wordIndex +
                        word.length;

                    if (
                        cutIndex > 0 &&
                        cutIndex < prefix.length
                    ) {
                        let first =
                            prefix.slice(
                                0,
                                cutIndex
                            );

                        let second =
                            prefix.slice(
                                cutIndex
                            );

                        if (
                            second.charAt(
                                0
                            ) === "の"
                        ) {
                            first +=
                                "の";

                            second =
                                second.slice(
                                    1
                                );
                        }

                        if (
                            first.length <= 13 &&
                            second.length <= 10 &&
                            second !== ""
                        ) {
                            return [
                                first,
                                second,
                                suffix,
                            ];
                        }
                    }
                }
            }

            let middle =
                Math.ceil(
                    prefix.length *
                    0.5
                );

            if (
                prefix.charAt(
                    middle
                ) === "の"
            ) {
                middle += 1;
            }

            let first =
                prefix.slice(
                    0,
                    middle
                );

            let second =
                prefix.slice(
                    middle
                );

            if (
                second.charAt(
                    0
                ) === "の"
            ) {
                first +=
                    "の";

                second =
                    second.slice(
                        1
                    );
            }

            if (
                second === ""
            ) {
                return [
                    first,
                    suffix,
                ];
            }

            return [
                first,
                second,
                suffix,
            ];
        };

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
            const suffix of suffixes
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

                return buildJapaneseResultLines(
                    prefix,
                    suffix
                );
            }
        }

        let middle =
            Math.ceil(
                name.length *
                0.5
            );

        if (
            name.charAt(
                middle
            ) === "の"
        ) {
            middle += 1;
        }

        let first =
            name.slice(
                0,
                middle
            );

        let second =
            name.slice(
                middle
            );

        if (
            second.charAt(
                0
            ) === "の"
        ) {
            first +=
                "の";

            second =
                second.slice(
                    1
                );
        }

        return [
            first,
            second,
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


function drawGlassFullMessage() {
    const effect =
        gameState.glassFullEffect;

    if (
        !effect ||
        !effect.visible
    ) {
        return;
    }

    const geometry =
        getBottleInspectionGeometry();

    const mouthX =
        geometry.centerX;

    const mouthY =
        geometry.centerY +
        (
            geometry.neckTop + 6
        ) *
            geometry.scale;

    const shoulderY =
        geometry.centerY +
        geometry.shoulderY *
            geometry.scale;

    const neckWidth =
        geometry.mouthWidth *
        geometry.scale *
        0.92;

    const ringW =
        neckWidth * 1.16 +
        effect.ring * 18;

    const ringH =
        11 *
            geometry.scale +
        effect.ring * 6;

    const surge =
        effect.scale;

    const wave =
        Math.sin(
            ElapsedTime * 10
        ) *
        1.6 *
        surge;

    noFill();

    stroke(
        255,
        221,
        151,
        effect.alpha * 0.55
    );

    strokeWidth(2.2);

    ellipse(
        mouthX,
        mouthY + 1,
        ringW,
        ringH
    );

    stroke(
        255,
        239,
        194,
        effect.alpha * 0.22
    );

    strokeWidth(1.4);

    ellipse(
        mouthX,
        mouthY + 1,
        ringW * 1.34,
        ringH * 1.55
    );

    noStroke();

    fill(
        101,
        54,
        24,
        effect.alpha * 0.88
    );

    ellipse(
        mouthX,
        mouthY - 1 +
            wave * 0.2,
        neckWidth * 1.08 +
            effect.ring * 12,
        9 *
            geometry.scale +
            surge * 1.5
    );

    fill(
        136,
        74,
        31,
        effect.alpha * 0.92
    );

    ellipse(
        mouthX,
        mouthY +
            0.8 +
            wave * 0.15,
        neckWidth * 0.95 +
            effect.ring * 9,
        5.5 *
            geometry.scale +
            surge
    );

    fill(
        223,
        158,
        78,
        effect.alpha * 0.34
    );

    ellipse(
        mouthX - neckWidth * 0.14,
        mouthY + 1.6,
        neckWidth * 0.38,
        2.8 *
            geometry.scale
    );

    strokeCap(ROUND);

    stroke(
        105,
        55,
        25,
        effect.alpha * 0.86
    );

    strokeWidth(
        4.4 *
            geometry.scale
    );

    line(
        mouthX - neckWidth * 0.28,
        mouthY - 1,
        mouthX - neckWidth * 0.36,
        mouthY -
            16 *
                surge
    );

    line(
        mouthX,
        mouthY - 1,
        mouthX - 1,
        mouthY -
            12 *
                surge
    );

    line(
        mouthX + neckWidth * 0.30,
        mouthY - 1,
        mouthX + neckWidth * 0.39,
        mouthY -
            18 *
                surge
    );

    stroke(
        232,
        173,
        95,
        effect.alpha * 0.34
    );

    strokeWidth(
        1.4 *
            geometry.scale
    );

    line(
        mouthX - neckWidth * 0.31,
        mouthY + 0.5,
        mouthX - neckWidth * 0.37,
        mouthY -
            13 *
                surge
    );

    line(
        mouthX + neckWidth * 0.29,
        mouthY + 0.5,
        mouthX + neckWidth * 0.35,
        mouthY -
            15 *
                surge
    );

    noStroke();

    fill(
        119,
        62,
        28,
        effect.alpha * 0.84
    );

    ellipse(
        mouthX - neckWidth * 0.45,
        shoulderY - 12,
        7.5 *
            geometry.scale
    );

    ellipse(
        mouthX + neckWidth * 0.47,
        shoulderY - 16,
        9 *
            geometry.scale
    );

    fill(
        240,
        178,
        97,
        effect.alpha * 0.28
    );

    ellipse(
        mouthX - neckWidth * 0.47,
        shoulderY - 10.5,
        3 *
            geometry.scale
    );

    ellipse(
        mouthX + neckWidth * 0.44,
        shoulderY - 13.5,
        3.2 *
            geometry.scale
    );

    for (
        let index = 0;
        index < 6;
        index += 1
    ) {
        const rise =
            (
                (
                    ElapsedTime * 1.8 +
                    index * 0.19
                ) %
                1
            );

        const bubbleX =
            mouthX +
            Math.sin(
                rise * 8 +
                index * 1.7
            ) *
            neckWidth *
            0.22;

        const bubbleY =
            mouthY +
            6 *
                geometry.scale +
            rise *
                30 *
                geometry.scale;

        const bubbleSize =
            (
                3.4 +
                (
                    index % 3
                ) *
                    1.1
            ) *
            (
                0.82 +
                effect.ring * 0.20
            );

        noFill();

        stroke(
            225,
            245,
            249,
            effect.alpha *
                (
                    0.26 +
                    0.34 * rise
                )
        );

        strokeWidth(1.1);

        ellipse(
            bubbleX,
            bubbleY,
            bubbleSize
        );
    }

    noStroke();
}


function isMysteryPhase() {
    return (
        gameState.phase ===
            "WAIT_MYSTERY_ROLL" ||
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
        !mystery.visible
    ) {
        return;
    }

    const rouletteLayout =
        getSharedRoulettePanelLayout();

    const panel =
        rouletteLayout.panel;

    const waiting =
        gameState.phase ===
        "WAIT_MYSTERY_ROLL";

    const rolling =
        gameState.phase ===
        "MYSTERY_ROLLING";

    const result =
        gameState.phase ===
        "MYSTERY_RESULT";

    const mode =
        waiting
            ? "waiting"
            : rolling
                ? "rolling"
                : "result";

    const accent = {
        r: 194,
        g: 142,
        b: 207,
    };

    pushMatrix();

    translate(
        panel.x,
        panel.y
    );

    drawSharedRoulettePanelBase(
        rouletteLayout,
        accent,
        gameState.language === "ja"
            ? "特殊素材"
            : "SPECIAL"
    );

    drawSharedRouletteRing(
        rouletteLayout,
        accent,
        mode
    );

    if (waiting) {
        fill(
            225,
            197,
            232,
            225
        );

        noStroke();

        fontSize(
            rouletteLayout.iconSize *
            0.80
        );

        textAlign(CENTER);

        text(
            "?",
            rouletteLayout.centerX,
            rouletteLayout.centerY
        );

        drawSharedRouletteStatusText(
            rouletteLayout,
            "TAP",
            170 +
                Math.sin(
                    ElapsedTime * 7
                ) *
                45
        );

        rectMode(CORNER);
        popMatrix();
        return;
    }

    const ingredient =
        mystery.ingredientId
            ? INGREDIENTS[
                mystery.ingredientId
            ]
            : null;

    if (!ingredient) {
        rectMode(CORNER);
        popMatrix();
        return;
    }

    const iconPulse =
        rolling
            ? 1 +
                Math.sin(
                    ElapsedTime * 21
                ) *
                0.06
            : 1.08;

    fill(
        ingredient.color.r,
        ingredient.color.g,
        ingredient.color.b,
        rolling
            ? 190
            : 235
    );

    noStroke();

    ellipse(
        rouletteLayout.centerX,
        rouletteLayout.centerY,
        rouletteLayout.iconSize *
            iconPulse
    );

    noFill();

    stroke(
        255,
        241,
        214,
        rolling
            ? 120
            : 215
    );

    strokeWidth(
        result
            ? 2.5
            : 1.8
    );

    ellipse(
        rouletteLayout.centerX,
        rouletteLayout.centerY,
        rouletteLayout.iconSize *
            iconPulse *
            1.08
    );

    noStroke();

    drawIngredientIcon(
        mystery.ingredientId,
        rouletteLayout.centerX,
        rouletteLayout.centerY,
        rouletteLayout.iconSize *
            0.55,
        255
    );

    if (rolling) {
        drawSharedRouletteStatusText(
            rouletteLayout,
            "•••",
            145
        );
    } else if (result) {
        drawSharedRouletteStatusText(
            rouletteLayout,
            ingredient[
                gameState.language
            ],
            230
        );
    }

    rectMode(CORNER);
    popMatrix();
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

function getSharedRoulettePanelLayout() {
    const panel =
        layout.cap;

    return {
        panel: panel,

        centerX:
            panel.w * 0.5,

        centerY:
            panel.h * 0.43,

        titleY:
            panel.h * 0.86,

        dividerY:
            panel.h * 0.76,

        footerY:
            panel.h * 0.12,

        iconSize:
            Math.min(
                64,
                panel.w * 0.21,
                panel.h * 0.25
            ),

        ringRadius:
            Math.min(
                54,
                panel.w * 0.18,
                panel.h * 0.21
            ),
    };
}

function drawSharedRoulettePanelBase(
    rouletteLayout,
    accent,
    title
) {
    const panel =
        rouletteLayout.panel;

    rectMode(CORNER);
    noStroke();

    fill(
        31,
        23,
        21,
        248
    );

    rect(
        4,
        4,
        panel.w - 8,
        panel.h - 8,
        13
    );

    fill(
        accent.r,
        accent.g,
        accent.b,
        24
    );

    rect(
        8,
        panel.h * 0.71,
        panel.w - 16,
        panel.h * 0.23,
        10
    );

    stroke(
        accent.r,
        accent.g,
        accent.b,
        84
    );

    strokeWidth(1.3);

    line(
        panel.w * 0.14,
        rouletteLayout.dividerY,
        panel.w * 0.86,
        rouletteLayout.dividerY
    );

    noStroke();

    if (
        typeof setGameUIFont ===
        "function"
    ) {
        setGameUIFont();
    }

    fill(
        235,
        217,
        190,
        178
    );

    fontSize(
        Math.min(
            13,
            panel.h * 0.052
        )
    );

    textAlign(CENTER);

    text(
        title,
        rouletteLayout.centerX,
        rouletteLayout.titleY
    );
}

function drawSharedRouletteRing(
    rouletteLayout,
    accent,
    mode
) {
    const waiting =
        mode === "waiting";

    const rolling =
        mode === "rolling";

    const result =
        mode === "result";

    const pulse =
        waiting
            ? 1 +
                Math.sin(
                    ElapsedTime * 6
                ) *
                0.05
            : result
                ? 1 +
                    Math.sin(
                        ElapsedTime * 8
                    ) *
                    0.025
                : 1;

    pushMatrix();

    translate(
        rouletteLayout.centerX,
        rouletteLayout.centerY
    );

    if (rolling) {
        rotate(
            ElapsedTime * 150
        );
    }

    noFill();

    stroke(
        accent.r,
        accent.g,
        accent.b,
        rolling
            ? 150
            : result
                ? 220
                : 125
    );

    strokeWidth(
        result
            ? 3
            : 2
    );

    ellipse(
        0,
        0,
        rouletteLayout.ringRadius *
            2 *
            pulse
    );

    stroke(
        255,
        238,
        205,
        rolling
            ? 105
            : result
                ? 170
                : 70
    );

    strokeWidth(1.5);

    for (
        let index = 0;
        index < 10;
        index += 1
    ) {
        const inner =
            rouletteLayout.ringRadius *
            0.82;

        const outer =
            rouletteLayout.ringRadius *
            (
                rolling
                    ? 1.02
                    : 0.96
            );

        line(
            0,
            inner,
            0,
            outer
        );

        rotate(36);
    }

    noStroke();

    popMatrix();
}

function drawSharedRouletteStatusText(
    rouletteLayout,
    value,
    alpha
) {
    if (
        typeof setGameUIFont ===
        "function"
    ) {
        setGameUIFont();
    }

    fill(
        224,
        207,
        185,
        alpha
    );

    noStroke();

    fontSize(
        Math.min(
            12,
            rouletteLayout.panel.h *
            0.047
        )
    );

    textAlign(CENTER);

    text(
        value,
        rouletteLayout.centerX,
        rouletteLayout.footerY
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
    const rouletteLayout =
        getSharedRoulettePanelLayout();

    const panel =
        rouletteLayout.panel;

    const waiting =
        gameState.phase ===
        "WAIT_EVENT_ROLL";

    const rolling =
        gameState.phase ===
        "EVENT_ROLLING";

    const result =
        gameState.phase ===
        "SHOWING_EVENT_RESULT";

    const mode =
        waiting
            ? "waiting"
            : rolling
                ? "rolling"
                : "result";

    const accent = {
        r: 208,
        g: 145,
        b: 78,
    };

    pushMatrix();

    translate(
        panel.x,
        panel.y
    );

    drawSharedRoulettePanelBase(
        rouletteLayout,
        accent,
        gameState.language === "ja"
            ? "ステア"
            : "STIR"
    );

    drawSharedRouletteRing(
        rouletteLayout,
        accent,
        mode
    );

    if (waiting) {
        drawEventIcon(
            "swap",
            rouletteLayout.centerX,
            rouletteLayout.centerY,
            rouletteLayout.iconSize *
                0.88,
            235
        );

        drawSharedRouletteStatusText(
            rouletteLayout,
            "TAP",
            170 +
                Math.sin(
                    ElapsedTime * 7
                ) *
                45
        );

        rectMode(CORNER);
        popMatrix();
        return;
    }

    if (
        !gameState.eventResultData
    ) {
        rectMode(CORNER);
        popMatrix();
        return;
    }

    const eventId =
        gameState.eventResultData.id;

    const iconPulse =
        rolling
            ? 1 +
                Math.sin(
                    ElapsedTime * 22
                ) *
                0.07
            : 1.08;

    drawEventIcon(
        eventId,
        rouletteLayout.centerX,
        rouletteLayout.centerY,
        rouletteLayout.iconSize *
            iconPulse,
        255
    );

    if (rolling) {
        drawSharedRouletteStatusText(
            rouletteLayout,
            "•••",
            145
        );
    } else if (result) {
        const display =
            getEventDisplayText(
                eventId
            );

        drawSharedRouletteStatusText(
            rouletteLayout,
            display.title,
            230
        );
    }

    rectMode(CORNER);
    popMatrix();
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
                    ? "グラスの順番が逆になる"
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
                ? "一番上の材料がこぼれる"
                : "SPILL THE TOP INGREDIENT",
    };
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

function drawCapacitySpillTokenOverlay() {
    const flow =
        gameState.capacitySpillFlow;

    if (
        !flow ||
        !flow.active ||
        flow.stage !== "spilling" ||
        !flow.spilled
    ) {
        return;
    }

    const ingredient =
        INGREDIENTS[
            flow.spilled.ingredientId
        ];

    if (!ingredient) {
        return;
    }

    const rawProgress =
        Math.max(
            0,
            Math.min(
                1,
                flow.visualProgress || 0
            )
        );

    const visibleProgress =
        Math.max(
            0,
            Math.min(
                1,
                (
                    rawProgress -
                    0.10
                ) /
                    0.90
            )
        );

    if (
        visibleProgress <= 0
    ) {
        return;
    }

    const t =
        1 -
        Math.pow(
            1 - visibleProgress,
            2
        );

    const geometry =
        getBottleInspectionGeometry();

    const startY =
        geometry.centerY +
        getGlassSlotLocalY(
            0
        ) *
            geometry.scale;

    const bottleEdgeX =
        geometry.centerX +
        flow.spillDirection *
            geometry.bodyWidth *
            geometry.scale *
            0.34;

    const travelDistance =
        Math.min(
            94,
            layout.glass.w *
                0.52
        );

    const x =
        bottleEdgeX +
        flow.spillDirection *
            (
                8 +
                travelDistance *
                    t
            );

    const y =
        startY -
        8 -
        26 *
            t +
        20 *
            t *
            t;

    const alpha =
        255 *
        Math.min(
            1,
            visibleProgress *
                4
        ) *
        (
            1 -
            t * 0.14
        );

    pushMatrix();

    translate(
        x,
        y
    );

    rotate(
        flow.spillDirection *
            (
                18 +
                42 * t
            )
    );

    scale(
        0.86 +
            0.10 *
                Math.sin(
                    t *
                    Math.PI
                )
    );

    noStroke();

    fill(
        8,
        5,
        3,
        alpha * 0.28
    );

    ellipse(
        5,
        -12,
        43,
        11
    );

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
        42,
        18,
        4
    );

    noFill();

    stroke(
        255,
        228,
        174,
        alpha * 0.68
    );

    strokeWidth(1.3);

    rect(
        0,
        0,
        42,
        18,
        4
    );

    noStroke();

    drawIngredientIcon(
        flow.spilled.ingredientId,
        0,
        0,
        15,
        alpha
    );

    rectMode(CORNER);

    popMatrix();

    const trailCount =
        3;

    for (
        let index = 0;
        index < trailCount;
        index += 1
    ) {
        const trailRatio =
            (
                index + 1
            ) /
            (
                trailCount + 1
            );

        const trailX =
            bottleEdgeX +
            flow.spillDirection *
                (
                    8 +
                    travelDistance *
                        t *
                        trailRatio
                );

        const trailY =
            startY -
            8 -
            26 *
                t *
                trailRatio;

        fill(
            ingredient.color.r,
            ingredient.color.g,
            ingredient.color.b,
            alpha *
                (
                    0.22 -
                    index * 0.05
                )
        );

        noStroke();

        ellipse(
            trailX,
            trailY,
            4 -
                index * 0.7
        );
    }

    noStroke();
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
        size * 0.5;

    const alpha =
        counter.alpha;

    rectMode(CENTER);
    textAlign(CENTER);
    noStroke();

    fill(
        10,
        7,
        6,
        alpha * 0.24
    );

    ellipse(
        3,
        -4,
        size + 5
    );

    for (
        let index = 0;
        index < 14;
        index += 1
    ) {
        pushMatrix();

        rotate(
            index *
                (
                    360 / 14
                )
        );

        translate(
            0,
            radius * 0.43
        );

        fill(
            81,
            54,
            31,
            alpha
        );

        rect(
            0,
            0,
            size * 0.14,
            size * 0.26,
            2
        );

        fill(
            228,
            190,
            119,
            alpha
        );

        rect(
            0,
            size * 0.014,
            size * 0.095,
            size * 0.19,
            2
        );

        popMatrix();
    }

    fill(
        100,
        65,
        37,
        alpha
    );

    ellipse(
        0,
        0,
        size * 0.88
    );

    fill(
        221,
        184,
        114,
        alpha
    );

    ellipse(
        0,
        0,
        size * 0.80
    );

    fill(
        248,
        236,
        210,
        alpha
    );

    ellipse(
        0,
        0,
        size * 0.64
    );

    fill(
        255,
        248,
        228,
        alpha * 0.78
    );

    ellipse(
        -size * 0.10,
        size * 0.11,
        size * 0.12
    );

    noFill();

    stroke(
        163,
        104,
        61,
        alpha * 0.62
    );

    strokeWidth(1.3);

    ellipse(
        0,
        0,
        size * 0.70
    );

    noStroke();

    fontSize(
        CONFIG.moveCounterFontSize
    );

    drawStrongNumberText(
        String(
            counter.displayValue
        ),
        0,
        size * 0.045,
        145,
        70,
        54,
        alpha,
        alpha * 0.20,
        0.78
    );

    rectMode(CORNER);
    noStroke();

    popMatrix();
}


function drawLanguageButton() {
    if (
        !gameState ||
        gameState.phase !== "TITLE"
    ) {
        return;
    }

    const button =
        getLanguageButtonRect();

    noStroke();
    rectMode(CORNER);

    fill(
        226,
        210,
        192,
        200
    );

    fontSize(15);
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



function drawStrongNumberText(
    value,
    x,
    y,
    mainR,
    mainG,
    mainB,
    mainA,
    shadowA,
    offset
) {
    const thickness =
        offset === undefined
            ? 0.8
            : offset;

    noStroke();

    fill(
        78,
        48,
        37,
        shadowA
    );

    text(
        value,
        x - thickness,
        y
    );

    text(
        value,
        x + thickness,
        y
    );

    text(
        value,
        x,
        y - thickness
    );

    text(
        value,
        x,
        y + thickness
    );

    fill(
        mainR,
        mainG,
        mainB,
        mainA
    );

    text(
        value,
        x,
        y
    );
}



function drawPanelFrame(panel) {
    const isBoardPanel =
        layout &&
        panel === layout.board;

    const shadowOffsetX =
        isBoardPanel
            ? 5
            : 6;

    const shadowOffsetY =
        isBoardPanel
            ? -5
            : -6;

    const shadowAlpha =
        isBoardPanel
            ? 80
            : 105;

    const baseColor =
        isBoardPanel
            ? {
                r: 40,
                g: 34,
                b: 34,
            }
            : {
                r: 56,
                g: 45,
                b: 41,
            };

    const insetColor =
        isBoardPanel
            ? {
                r: 52,
                g: 43,
                b: 40,
                a: 52,
            }
            : {
                r: 96,
                g: 73,
                b: 60,
                a: 60,
            };

    const borderColor =
        isBoardPanel
            ? {
                r: 108,
                g: 85,
                b: 78,
                a: 210,
            }
            : {
                r: 150,
                g: 112,
                b: 88,
                a: 235,
            };

    const innerBorderColor =
        isBoardPanel
            ? {
                r: 170,
                g: 134,
                b: 108,
                a: 26,
            }
            : {
                r: 233,
                g: 190,
                b: 141,
                a: 42,
            };

    const radius =
        isBoardPanel
            ? 16
            : 18;

    noStroke();

    fill(
        10,
        8,
        8,
        shadowAlpha
    );

    rect(
        panel.x +
            shadowOffsetX,
        panel.y +
            shadowOffsetY,
        panel.w,
        panel.h,
        radius
    );

    fill(
        baseColor.r,
        baseColor.g,
        baseColor.b
    );

    rect(
        panel.x,
        panel.y,
        panel.w,
        panel.h,
        radius
    );

    fill(
        insetColor.r,
        insetColor.g,
        insetColor.b,
        insetColor.a
    );

    rect(
        panel.x + 6,
        panel.y + 6,
        panel.w - 12,
        panel.h - 12,
        radius - 4
    );

    if (!isBoardPanel) {
        fill(
            255,
            228,
            188,
            10
        );

        rect(
            panel.x + 10,
            panel.y + panel.h * 0.58,
            panel.w - 20,
            panel.h * 0.24,
            10
        );

        fill(
            255,
            236,
            214,
            8
        );

        rect(
            panel.x + 10,
            panel.y + panel.h - 18,
            panel.w - 20,
            8,
            4
        );
    }

    noFill();

    stroke(
        borderColor.r,
        borderColor.g,
        borderColor.b,
        borderColor.a
    );

    strokeWidth(
        isBoardPanel
            ? 2
            : 2.2
    );

    rect(
        panel.x,
        panel.y,
        panel.w,
        panel.h,
        radius
    );

    stroke(
        innerBorderColor.r,
        innerBorderColor.g,
        innerBorderColor.b,
        innerBorderColor.a
    );

    strokeWidth(1);

    rect(
        panel.x + 4,
        panel.y + 4,
        panel.w - 8,
        panel.h - 8,
        radius - 3
    );

    if (!isBoardPanel) {
        stroke(
            223,
            185,
            144,
            24
        );

        strokeWidth(1.2);

        line(
            panel.x + 16,
            panel.y + panel.h - 14,
            panel.x + panel.w - 16,
            panel.y + panel.h - 14
        );

        line(
            panel.x + 16,
            panel.y + panel.h - 22,
            panel.x + panel.w - 16,
            panel.y + panel.h - 22
        );
    }

    noStroke();

    drawPanelHardwareDetails(
        panel,
        isBoardPanel
    );
}

function drawPanelHardwareDetails(
    panel,
    isBoardPanel
) {
    if (isBoardPanel) {
        return;
    }

    const screwOffsetX = 18;
    const screwOffsetY = 18;
    const weldY =
        panel.y +
        panel.h - 12;

    drawPanelScrew(
        panel.x + screwOffsetX,
        panel.y + screwOffsetY,
        10
    );

    drawPanelScrew(
        panel.x + panel.w - screwOffsetX,
        panel.y + screwOffsetY,
        10
    );

    drawPanelScrew(
        panel.x + screwOffsetX,
        panel.y + panel.h - screwOffsetY,
        10
    );

    drawPanelScrew(
        panel.x + panel.w - screwOffsetX,
        panel.y + panel.h - screwOffsetY,
        10
    );

    drawPanelWeldMark(
        panel.x + panel.w * 0.26,
        weldY,
        16
    );

    drawPanelWeldMark(
        panel.x + panel.w * 0.50,
        weldY,
        16
    );

    drawPanelWeldMark(
        panel.x + panel.w * 0.74,
        weldY,
        16
    );
}

function drawPanelScrew(
    x,
    y,
    size
) {
    ellipseMode(CENTER);
    noStroke();

    fill(
        26,
        18,
        15,
        120
    );

    ellipse(
        x + 1.5,
        y - 1.5,
        size + 4
    );

    fill(
        144,
        104,
        76,
        245
    );

    ellipse(
        x,
        y,
        size + 2
    );

    fill(
        194,
        147,
        104,
        255
    );

    ellipse(
        x,
        y + 0.5,
        size
    );

    stroke(
        88,
        58,
        38,
        215
    );

    strokeWidth(1.4);

    line(
        x - size * 0.22,
        y,
        x + size * 0.22,
        y
    );

    noStroke();
    ellipseMode(CENTER);
}

function drawPanelWeldMark(
    x,
    y,
    width
) {
    stroke(
        184,
        128,
        86,
        76
    );

    strokeWidth(1.4);

    for (
        let index = 0;
        index < 4;
        index += 1
    ) {
        const px =
            x -
            width * 0.5 +
            index * (
                width / 3
            );

        line(
            px - 1.5,
            y - 1,
            px + 1.5,
            y + 1
        );
    }

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
                (
                    worldX -
                    gameState.camera.x
                ) *
                    gameState.camera.zoom +
                centerX,

            y:
                (
                    worldY -
                    gameState.camera.y
                ) *
                    gameState.camera.zoom +
                centerY,
        };
    };

    const worldToBoardNode = function(node) {
        return worldToBoardPoint(
            node.nx *
                CONFIG.mapWidth,
            node.ny *
                CONFIG.mapHeight
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
                BOARD_NODES[
                    nodeId
                ];

            if (!node) {
                return;
            }

            if (
                distanceMap[
                    nodeId
                ] === undefined ||
                distance <
                    distanceMap[
                        nodeId
                    ]
            ) {
                distanceMap[
                    nodeId
                ] =
                    distance;
            }

            if (node.next) {
                traverse(
                    node.next,
                    distance + 1
                );
            } else if (
                node.choices
            ) {
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
        Object.values(
            BOARD_NODES
        )
    ) {
        const point1 =
            worldToBoardNode(
                node
            );

        if (node.next) {
            const nextNode =
                BOARD_NODES[
                    node.next
                ];

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
                    drawBoardPipeSegment(
                        point1,
                        point2,
                        false
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
                    drawBoardPipeSegment(
                        point1,
                        point2,
                        true
                    );
                }
            }
        }
    }

    noStroke();

    for (
        const node of
        Object.values(
            BOARD_NODES
        )
    ) {
        const point =
            worldToBoardNode(
                node
            );

        const nodeScale =
            getBoardNodeVisualScale(
                node
            );

        const nodeSize =
            CONFIG.nodeSize *
            nodeScale;

        if (
            point.x <
                -nodeSize * 2 ||
            point.x >
                panel.w +
                nodeSize * 2 ||
            point.y <
                -nodeSize * 2 ||
            point.y >
                panel.h +
                nodeSize * 2
        ) {
            continue;
        }

        fill(
            18,
            15,
            15,
            125
        );

        ellipse(
            point.x + 2,
            point.y - 2,
            nodeSize + 7
        );

        fill(
            126,
            117,
            111
        );

        ellipse(
            point.x,
            point.y,
            nodeSize
        );

        noFill();

        stroke(
            210,
            196,
            182,
            105
        );

        strokeWidth(
            CONFIG.boardNodeOutlineWidth
        );

        ellipse(
            point.x,
            point.y,
            nodeSize
        );

        noStroke();

        if (
            distanceMap[
                node.id
            ] !== undefined
        ) {
            noFill();

            stroke(
                255,
                216,
                125,
                145
            );

            strokeWidth(2);

            ellipse(
                point.x,
                point.y,
                nodeSize *
                    CONFIG.boardReachableRingScale
            );

            noStroke();
        }

        drawNodeIcon(
            node,
            point.x,
            point.y,
            CONFIG.boardNodeIconSize *
                nodeScale,
            255
        );

        if (
            distanceMap[
                node.id
            ] !== undefined
        ) {
            const distance =
                distanceMap[
                    node.id
                ];

            fill(
                28,
                22,
                20,
                230
            );

            ellipse(
                point.x,
                point.y +
                    CONFIG.boardDistanceOffset,
                26
            );

            noFill();

            stroke(
                255,
                213,
                120,
                210
            );

            strokeWidth(2);

            ellipse(
                point.x,
                point.y +
                    CONFIG.boardDistanceOffset,
                26
            );

            noStroke();

            fill(
                255,
                232,
                155,
                255
            );

            fontSize(
                CONFIG.boardDistanceFontSize
            );

            textAlign(CENTER);

            text(
                String(
                    distance
                ),
                point.x,
                point.y +
                    CONFIG.boardDistanceOffset
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

        let bottleRotation = 0;
        let bottleLift = 0;

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

                const moveDirection =
                    Math.max(
                        -1,
                        Math.min(
                            1,
                            (
                                targetWorldX -
                                tokenWorldX
                            ) /
                                (
                                    CONFIG.mapWidth *
                                    0.15
                                )
                        )
                    );

                bottleRotation =
                    moveDirection *
                        CONFIG.boardBottleTilt +
                    Math.sin(
                        progress *
                            Math.PI *
                            4
                    ) *
                        2.5;

                bottleLift =
                    Math.sin(
                        progress *
                        Math.PI
                    ) *
                    CONFIG.boardBottleMoveLift;

                tokenWorldX +=
                    (
                        targetWorldX -
                        tokenWorldX
                    ) *
                    progress;

                tokenWorldY +=
                    (
                        targetWorldY -
                        tokenWorldY
                    ) *
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
                0.18;

        if (
            gameState.landingPulse >
            0
        ) {
            noFill();

            stroke(
                255,
                187,
                115,
                120
            );

            strokeWidth(3);

            ellipse(
                tokenPoint.x,
                tokenPoint.y,
                CONFIG.currentNodeSize *
                    1.75 *
                    (
                        1 +
                        gameState.landingPulse *
                            0.42
                    )
            );

            stroke(
                255,
                225,
                175,
                65
            );

            strokeWidth(2);

            ellipse(
                tokenPoint.x,
                tokenPoint.y,
                CONFIG.currentNodeSize *
                    2.2 *
                    (
                        1 +
                        gameState.landingPulse *
                            0.32
                    )
            );

            noStroke();
        }

        drawBoardBottleToken(
            tokenPoint.x,
            tokenPoint.y -
                bottleLift,
            pulse,
            bottleRotation,
            255
        );
    }

    popMatrix();
    clip();
}

function buildBoardDistanceHintMap() {
    const distanceMap = {};

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
            BOARD_NODES[
                nodeId
            ];

        if (!node) {
            return;
        }

        if (
            distanceMap[
                nodeId
            ] === undefined ||
            distance <
                distanceMap[
                    nodeId
                ]
        ) {
            distanceMap[
                nodeId
            ] =
                distance;
        }

        if (node.next) {
            traverse(
                node.next,
                distance + 1
            );
        } else if (
            node.choices
        ) {
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

    if (!currentNode) {
        return distanceMap;
    }

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

    return distanceMap;
}


function updateBoardDistanceHintFade() {
    if (!gameState) {
        return;
    }

    if (
        !gameState.boardDistanceHintFade
    ) {
        gameState.boardDistanceHintFade = {
            visible: false,
            targetVisible: false,
            alpha: 0,
            distanceMap: {},
        };
    }

    const hint =
        gameState.boardDistanceHintFade;

    const shouldShow =
        gameState.phase ===
        "WAIT_CAP_POWER";

    if (shouldShow) {
        hint.distanceMap =
            buildBoardDistanceHintMap();

        if (!hint.targetVisible) {
            hint.visible =
                true;

            hint.targetVisible =
                true;

            hint.alpha = 0;

            if (
                typeof tween ===
                    "undefined" ||
                !tween ||
                !tween.easing
            ) {
                hint.alpha = 1;
                return;
            }

            tween(
                0.16,
                hint,
                {
                    alpha: 1,
                },
                tween.easing.quadOut
            );
        }

        return;
    }

    if (!hint.targetVisible) {
        return;
    }

    hint.targetVisible =
        false;

    if (
        typeof tween ===
            "undefined" ||
        !tween ||
        !tween.easing
    ) {
        hint.alpha = 0;
        hint.visible = false;
        return;
    }

    tween(
        0.14,
        hint,
        {
            alpha: 0,
        },
        tween.easing.quadIn,
        function() {
            if (
                !hint.targetVisible
            ) {
                hint.visible =
                    false;
            }
        }
    );
}


function drawBoardDistanceHintFadeOverlay() {
    const hint =
        gameState.boardDistanceHintFade;

    if (
        !hint ||
        !hint.visible ||
        hint.alpha <= 0.001
    ) {
        return;
    }

    const panel =
        layout.board;

    const alpha =
        Math.max(
            0,
            Math.min(
                1,
                hint.alpha
            )
        );

    const distanceMap =
        hint.distanceMap || {};

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

    const worldToBoardPoint =
        function(
            worldX,
            worldY
        ) {
            return {
                x:
                    (
                        worldX -
                        gameState.camera.x
                    ) *
                        gameState.camera.zoom +
                    centerX,

                y:
                    (
                        worldY -
                        gameState.camera.y
                    ) *
                        gameState.camera.zoom +
                    centerY,
            };
        };

    for (
        const node of
        Object.values(
            BOARD_NODES
        )
    ) {
        const distance =
            distanceMap[
                node.id
            ];

        if (
            distance === undefined
        ) {
            continue;
        }

        const point =
            worldToBoardPoint(
                node.nx *
                    CONFIG.mapWidth,
                node.ny *
                    CONFIG.mapHeight
            );

        const nodeScale =
            getBoardNodeVisualScale(
                node
            );

        const nodeSize =
            CONFIG.nodeSize *
            nodeScale;

        if (
            point.x <
                -nodeSize * 2 ||
            point.x >
                panel.w +
                nodeSize * 2 ||
            point.y <
                -nodeSize * 2 ||
            point.y >
                panel.h +
                nodeSize * 2
        ) {
            continue;
        }

        noFill();

        stroke(
            255,
            216,
            125,
            145 * alpha
        );

        strokeWidth(2);

        ellipse(
            point.x,
            point.y,
            nodeSize *
                CONFIG.boardReachableRingScale
        );

        noStroke();

        const badgeY =
            point.y +
            CONFIG.boardDistanceOffset;

        fill(
            28,
            22,
            20,
            230 * alpha
        );

        ellipse(
            point.x,
            badgeY,
            26
        );

        noFill();

        stroke(
            255,
            213,
            120,
            210 * alpha
        );

        strokeWidth(2);

        ellipse(
            point.x,
            badgeY,
            26
        );

        noStroke();

        fill(
            255,
            232,
            155,
            255 * alpha
        );

        fontSize(
            CONFIG.boardDistanceFontSize
        );

        textAlign(CENTER);

        /*
         * 数字だけを、円の視覚中心より少し上へ。
         * Codea座標では Y を増やすと上方向です。
         */
        text(
            String(
                distance
            ),
            point.x,
            badgeY + 2.2
        );
    }

    popMatrix();
    clip();

    noStroke();
    rectMode(CORNER);
    ellipseMode(CENTER);
}


const drawBoardPanelBaseForHintFade =
    drawBoardPanel;

drawBoardPanel = function() {
    updateBoardDistanceHintFade();

    const originalPhase =
        gameState.phase;

    const suppressBaseHints =
        originalPhase ===
        "WAIT_CAP_POWER";

    /*
     * 元のヒントだけを非表示にし、
     * フェード付きのオーバーレイ側で描き直す。
     */
    if (suppressBaseHints) {
        gameState.phase =
            "WAIT_CAP_POWER_HINT_FADE";
    }

    drawBoardPanelBaseForHintFade();

    gameState.phase =
        originalPhase;

    drawBoardDistanceHintFadeOverlay();
};



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
    alpha
) {
    if (
        node.choices &&
        node.choices.length >= 2
    ) {
        const active =
            gameState.currentNodeId ===
                node.id &&
            !gameState.selectedRoutes[
                node.id
            ];

        drawBranchValveNode(
            node,
            x,
            y,
            size * 1.18,
            alpha,
            active
        );

        return;
    }

    if (
        node.nodeType ===
        "event_gate"
    ) {
        drawShakeStationIcon(
            x,
            y,
            size,
            alpha
        );

        return;
    }

    if (
        node.effect &&
        node.effect.addIngredient ===
            "ice"
    ) {
        drawCoolingStationIcon(
            x,
            y,
            size,
            alpha,
            gameState.currentNodeId ===
                node.id
        );

        return;
    }

    if (
        drawBoardStationIcon(
            node,
            x,
            y,
            size,
            alpha
        )
    ) {
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
            alpha
        );

        return;
    }

    if (
        node.effect &&
        node.effect.addMystery
    ) {
        fill(
            220,
            170,
            220,
            alpha
        );

        fontSize(
            size * 1.15
        );

        textAlign(CENTER);

        text(
            "?",
            x,
            y
        );

        return;
    }

    if (
        node.effect &&
        node.effect.pressureDelta > 0
    ) {
        fill(
            180,
            225,
            245,
            alpha
        );

        ellipse(
            x - 4,
            y - 3,
            4
        );

        ellipse(
            x + 3,
            y + 1,
            5
        );

        ellipse(
            x,
            y + 5,
            3
        );
    }
}

function drawShakeStationIcon(
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

    scale(
        size / 24,
        size / 24
    );

    drawBoardStationBase(
        alpha,
        false
    );

    pushMatrix();

    rotate(-14);

    rectMode(CENTER);

    fill(
        112,
        62,
        31,
        alpha
    );

    rect(
        0,
        -1,
        9,
        15,
        3
    );

    fill(
        156,
        95,
        47,
        alpha
    );

    rect(
        0,
        8,
        4,
        5,
        1
    );

    noFill();

    stroke(
        238,
        191,
        117,
        alpha * 0.80
    );

    strokeWidth(1.4);

    rect(
        0,
        -1,
        9,
        15,
        3
    );

    noStroke();

    popMatrix();

    stroke(
        238,
        191,
        117,
        alpha * 0.82
    );

    strokeWidth(1.8);

    line(
        -11,
        6,
        -15,
        3
    );

    line(
        -11,
        0,
        -16,
        -3
    );

    line(
        10,
        5,
        15,
        8
    );

    line(
        11,
        -1,
        16,
        2
    );

    noStroke();

    rectMode(CORNER);

    popMatrix();
}



function drawCoolingStationIcon(
    x,
    y,
    size,
    alpha,
    active
) {
    const pulse =
        active
            ? 1 +
                Math.sin(
                    ElapsedTime *
                    CONFIG.boardStationPulseSpeed
                ) *
                0.05
            : 1;

    pushMatrix();

    translate(
        x,
        y
    );

    scale(
        size /
        24 *
        pulse,
        size /
        24 *
        pulse
    );

    drawBoardStationBase(
        alpha,
        false
    );

    noFill();

    stroke(
        205,
        238,
        248,
        alpha
    );

    strokeWidth(2);

    ellipse(
        0,
        0,
        15
    );

    for (
        let index = 0;
        index < 6;
        index += 1
    ) {
        pushMatrix();

        rotate(
            index * 60
        );

        line(
            0,
            0,
            0,
            8
        );

        line(
            0,
            5,
            -3,
            8
        );

        line(
            0,
            5,
            3,
            8
        );

        popMatrix();
    }

    stroke(
        245,
        253,
        255,
        alpha * 0.72
    );

    strokeWidth(1);

    ellipse(
        0,
        0,
        7
    );

    noStroke();

    fill(
        222,
        247,
        252,
        alpha
    );

    ellipse(
        0,
        0,
        3
    );

    popMatrix();

    noStroke();
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
            "LANDING";

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

function drawCapPressureBubbles() {
    const activePhases = [
        "WAIT_CAP_POWER",
        "CAP_SLIDING",
        "CAP_PHYSICS",
        "CAP_POWER_RESULT",
    ];

    if (
        activePhases.indexOf(
            gameState.phase
        ) < 0
    ) {
        return;
    }

    const glass =
        gameState.glass;

    const pressure =
        glass
            ? Math.max(
                0,
                glass.pressure || 0
            )
            : 0;

    const pressureMax =
        Math.max(
            3,
            CONFIG.pressureMax || 3
        );

    const warningStart =
        Math.max(
            3,
            pressureMax - 2
        );

    if (
        pressure < warningStart
    ) {
        return;
    }

    const panel =
        layout.cap;

    const cap =
        gameState.cap;

    const physicsVisible =
        gameState.phase ===
            "CAP_PHYSICS" ||
        gameState.phase ===
            "CAP_POWER_RESULT";

    const gaugeLayout =
        getMainGaugeLayout(
            panel
        );

    const localX =
        physicsVisible
            ? cap.x
            : gaugeLayout.centerX;

    const localY =
        physicsVisible
            ? cap.y
            : gaugeLayout.centerY;

    const capSize =
        Math.min(
            CONFIG.capSize * 1.08,
            panel.w * 0.25,
            panel.h * 0.16
        );

    const warningLevel =
        Math.max(
            0,
            Math.min(
                1,
                (
                    pressure -
                    warningStart
                ) /
                Math.max(
                    1,
                    pressureMax -
                        warningStart
                )
            )
        );

    const bubbleCount =
        2 +
        Math.floor(
            warningLevel * 3
        );

    noFill();

    for (
        let index = 0;
        index < bubbleCount;
        index += 1
    ) {
        const phase =
            ElapsedTime *
                (
                    1.8 +
                    warningLevel * 2.4
                ) +
            index * 2.32;

        const rise =
            (
                ElapsedTime *
                    (
                        10 +
                        warningLevel * 12
                    ) +
                index *
                    capSize *
                    0.42
            ) %
            (
                capSize * 0.92
            );

        const orbit =
            capSize *
            (
                0.46 +
                (
                    index % 2
                ) *
                    0.07
            );

        const bubbleX =
            panel.x +
            localX +
            Math.cos(
                phase
            ) *
                orbit;

        const bubbleY =
            panel.y +
            localY +
            capSize * 0.17 -
            rise +
            Math.sin(
                phase * 1.4
            ) *
                capSize *
                0.06;

        const bubbleSize =
            2.2 +
            (
                index % 3
            ) *
                0.9 +
            warningLevel * 0.8;

        const bubbleAlpha =
            (
                62 +
                warningLevel * 86
            ) *
            (
                0.72 +
                (
                    index % 3
                ) *
                    0.10
            );

        stroke(
            221,
            246,
            250,
            bubbleAlpha
        );

        strokeWidth(
            1.05 +
            warningLevel * 0.35
        );

        ellipse(
            bubbleX,
            bubbleY,
            bubbleSize
        );
    }

    noStroke();
}

const drawCapPanelBase =
    drawCapPanel;

drawCapPanel = function() {
    drawCapPanelBase();
    drawCapPressureBubbles();
};


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
        0.06;

    const targetX =
        gaugeLayout.centerX +
        aimValue *
            gaugeLayout.radius *
            0.70;

    const targetY =
        gaugeLayout.centerY -
        gaugeLayout.radius *
            0.48;

    noFill();

    stroke(
        226,
        164,
        90,
        120
    );

    strokeWidth(1.8);

    line(
        gaugeLayout.centerX,
        gaugeLayout.centerY,
        targetX,
        targetY
    );

    stroke(
        255,
        226,
        160,
        190
    );

    strokeWidth(2);

    ellipse(
        targetX,
        targetY,
        gaugeLayout.radius *
            0.18 *
            pulse
    );

    noStroke();

    fill(
        255,
        222,
        150,
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
            panel.w * 0.34,
            panel.h * 0.30
        );

    const capSize =
        Math.min(
            CONFIG.capSize * 1.10,
            radius * 0.30
        );

    const maxDistance =
        Math.max(
            20,
            radius -
                capSize * 0.58 -
                5
        );

    const centerX =
        panel.w * 0.50;

    const centerY =
        panel.h * 0.43;

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

    rectMode(CORNER);
    noStroke();

    fill(
        31,
        23,
        21,
        248
    );

    rect(
        4,
        4,
        panel.w - 8,
        panel.h - 8,
        13
    );

    fill(
        208,
        145,
        78,
        20
    );

    rect(
        8,
        panel.h * 0.71,
        panel.w - 16,
        panel.h * 0.23,
        10
    );

    stroke(
        208,
        145,
        78,
        82
    );

    strokeWidth(1.3);

    line(
        panel.w * 0.14,
        panel.h * 0.76,
        panel.w * 0.86,
        panel.h * 0.76
    );

    noStroke();

    if (
        typeof setGameUIFont ===
            "function"
    ) {
        setGameUIFont();
    }

    fill(
        235,
        217,
        190,
        178
    );

    fontSize(
        Math.min(
            13,
            panel.h * 0.052
        )
    );

    textAlign(CENTER);

    text(
        gameState.language === "ja"
            ? "王冠ショット"
            : "CAP SHOT",
        panel.w * 0.5,
        panel.h * 0.86
    );

    noStroke();

    fill(
        12,
        9,
        9,
        145
    );

    ellipse(
        board.centerX,
        board.centerY,
        board.radius * 2.08
    );

    fill(
        resultValue === 1
            ? 96
            : 45,
        resultValue === 1
            ? 67
            : 36,
        resultValue === 1
            ? 43
            : 32,
        240
    );

    ellipse(
        board.centerX,
        board.centerY,
        board.maxDistance * 2
    );

    fill(
        resultValue === 2
            ? 138
            : 70,
        resultValue === 2
            ? 90
            : 50,
        resultValue === 2
            ? 48
            : 36,
        245
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
            ? 190
            : 103,
        resultValue === 3
            ? 128
            : 70,
        resultValue === 3
            ? 60
            : 43,
        250
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
        178,
        139,
        99,
        physics
            ? 120 +
                physics.wallFlash *
                    100
            : 120
    );

    strokeWidth(
        physics
            ? 2.4 +
                physics.wallFlash *
                    3
            : 2.4
    );

    ellipse(
        board.centerX,
        board.centerY,
        board.radius * 2.08
    );

    stroke(
        218,
        190,
        148,
        92
    );

    strokeWidth(1.5);

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
            184,
            140,
            resultVisible
                ? 105
                : 48
        );

        strokeWidth(
            resultVisible
                ? 1.7
                : 1
        );

        line(
            board.centerX,
            board.centerY -
                board.radius *
                    0.86,
            board.centerX,
            board.centerY +
                board.radius *
                    0.86
        );
    }

    noStroke();

    fontSize(
        Math.max(
            13,
            board.radius *
                0.16
        )
    );

    textAlign(CENTER);

    drawStrongNumberText(
        "1",
        board.centerX -
            board.maxDistance *
                0.79,
        board.centerY,
        238,
        215,
        178,
        resultValue === 1
            ? 240
            : 112,
        resultValue === 1
            ? 95
            : 44,
        0.66
    );

    drawStrongNumberText(
        "1",
        board.centerX +
            board.maxDistance *
                0.79,
        board.centerY,
        238,
        215,
        178,
        resultValue === 1
            ? 240
            : 112,
        resultValue === 1
            ? 95
            : 44,
        0.66
    );

    drawStrongNumberText(
        "2",
        board.centerX -
            board.maxDistance *
                0.47,
        board.centerY,
        244,
        211,
        150,
        resultValue === 2
            ? 250
            : 126,
        resultValue === 2
            ? 105
            : 50,
        0.66
    );

    drawStrongNumberText(
        "2",
        board.centerX +
            board.maxDistance *
                0.47,
        board.centerY,
        244,
        211,
        150,
        resultValue === 2
            ? 250
            : 126,
        resultValue === 2
            ? 105
            : 50,
        0.66
    );

    drawStrongNumberText(
        "3",
        board.centerX,
        board.centerY,
        255,
        232,
        185,
        resultValue === 3
            ? 255
            : 162,
        resultValue === 3
            ? 118
            : 58,
        0.70
    );

    if (branchRelevant) {
        const arrowY =
            board.centerY -
            board.radius *
                0.68;

        const arrowOffset =
            board.maxDistance *
                0.58;

        fill(
            255,
            226,
            160,
            branchIndex === 0
                ? 245
                : resultVisible
                    ? 62
                    : 108
        );

        fontSize(
            Math.max(
                17,
                board.radius *
                    0.22 *
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
                ? 245
                : resultVisible
                    ? 62
                    : 108
        );

        fontSize(
            Math.max(
                17,
                board.radius *
                    0.22 *
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
        78
    );

    strokeWidth(1.5);

    line(
        board.centerX,
        board.launchY -
            board.capSize *
                0.55,
        board.centerX,
        board.launchY -
            board.capSize *
                1.02
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

        drawCapShotResultBadge(
            panel,
            board,
            cap,
            physics,
            branchRelevant,
            branchIndex
        );

        rectMode(CORNER);
    }
}



function getMainGaugeLayout(panel) {
    const radius =
        Math.min(
            panel.w * 0.31,
            panel.h * 0.25
        );

    return {
        centerX:
            panel.w * 0.50,

        centerY:
            panel.h * 0.43,

        radius:
            radius,

        scale: 1,

        sourceCenterX:
            panel.w * 0.50,

        sourceCenterY:
            panel.h * 0.43,
    };
}


function drawMainCapPressureGauge(
    panel,
    power,
    sliding
) {
    drawCapPressureGauge(
        panel,
        power,
        false,
        sliding
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
}

function drawCapShotResultBadge(
    panel,
    board,
    cap,
    physics,
    branchRelevant,
    branchIndex
) {
    const badgeW =
        Math.min(
            board.radius *
                1.12,
            86
        );

    const badgeH =
        Math.min(
            board.radius *
                0.44,
            42
        );

    const badgeX =
        board.centerX;

    const stopFlash =
        physics &&
        physics.stopFlash !==
            undefined
            ? Math.max(
                0,
                Math.min(
                    1,
                    physics.stopFlash
                )
            )
            : 0;

    const stopRing =
        physics &&
        physics.stopRing !==
            undefined
            ? Math.max(
                0,
                Math.min(
                    1,
                    physics.stopRing
                )
            )
            : 1;

    const introMotion =
        Math.max(
            stopFlash,
            1 - stopRing
        );

    const badgeScale =
        1 -
        introMotion * 0.055;

    const badgeYOffset =
        introMotion * 6;

    const badgeY =
        panel.h * 0.14 +
        badgeYOffset;

    const badgeAlpha =
        224 +
        (
            1 -
            introMotion
        ) *
            12;

    rectMode(CENTER);

    fill(
        21,
        15,
        14,
        badgeAlpha
    );

    rect(
        badgeX,
        badgeY,
        badgeW *
            badgeScale,
        badgeH *
            badgeScale,
        badgeH *
            0.40
    );

    noFill();

    stroke(
        244,
        198,
        112,
        214 +
            (
                1 -
                introMotion
            ) *
                20
    );

    strokeWidth(
        2.2 -
        introMotion * 0.3
    );

    rect(
        badgeX,
        badgeY,
        badgeW *
            badgeScale,
        badgeH *
            badgeScale,
        badgeH *
            0.40
    );

    stroke(
        255,
        230,
        182,
        42 +
            (
                1 -
                introMotion
            ) *
                22
    );

    strokeWidth(1);

    line(
        badgeX -
            badgeW *
                0.26 *
                badgeScale,
        badgeY -
            badgeH *
                0.18 *
                badgeScale,
        badgeX +
            badgeW *
                0.26 *
                badgeScale,
        badgeY -
            badgeH *
                0.18 *
                badgeScale
    );

    noStroke();

    fontSize(
        badgeH *
            0.64
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

    drawStrongNumberText(
        directionResult,
        badgeX,
        badgeY,
        255,
        238,
        198,
        255,
        96,
        0.84
    );

    rectMode(CORNER);
}




function drawCapPressureGauge(
    panel,
    power,
    locked,
    sliding
) {
    const gaugeLayout =
        getMainGaugeLayout(
            panel
        );

    const centerX =
        gaugeLayout.centerX;

    const centerY =
        gaugeLayout.centerY;

    const radius =
        gaugeLayout.radius;

    const gaugeFrameCenterY =
        centerY +
        radius * 0.20;

    const gaugeFrameHeight =
        radius * 1.78;

    const startAngle = 205;
    const endAngle = -25;

    rectMode(CORNER);
    noStroke();

    fill(
        31,
        23,
        21,
        248
    );

    rect(
        4,
        4,
        panel.w - 8,
        panel.h - 8,
        13
    );

    fill(
        208,
        145,
        78,
        20
    );

    rect(
        8,
        panel.h * 0.71,
        panel.w - 16,
        panel.h * 0.23,
        10
    );

    stroke(
        208,
        145,
        78,
        82
    );

    strokeWidth(1.3);

    line(
        panel.w * 0.14,
        panel.h * 0.76,
        panel.w * 0.86,
        panel.h * 0.76
    );

    noStroke();

    if (
        typeof setGameUIFont ===
        "function"
    ) {
        setGameUIFont();
    }

    fill(
        235,
        217,
        190,
        178
    );

    fontSize(
        Math.min(
            13,
            panel.h * 0.052
        )
    );

    textAlign(CENTER);

    text(
        gameState.language === "ja"
            ? "ショット圧"
            : "SHOT POWER",
        panel.w * 0.5,
        panel.h * 0.86
    );

    noStroke();

    fill(
        12,
        9,
        9,
        122
    );

    rectMode(CENTER);

    rect(
        centerX,
        gaugeFrameCenterY,
        radius * 2.42,
        gaugeFrameHeight,
        16
    );

    noFill();

    stroke(
        106,
        82,
        67,
        140
    );

    strokeWidth(2);

    rect(
        centerX,
        gaugeFrameCenterY,
        radius * 2.42,
        gaugeFrameHeight,
        16
    );

    const zones = [
        {
            start: 0,
            end:
                CONFIG.capPowerZone1End,
            color:
                color(
                    114,
                    118,
                    76
                ),
        },
        {
            start:
                CONFIG.capPowerZone1End,
            end:
                CONFIG.capPowerZone2End,
            color:
                color(
                    183,
                    133,
                    61
                ),
        },
        {
            start:
                CONFIG.capPowerZone2End,
            end:
                CONFIG.capPowerZone3End,
            color:
                color(
                    200,
                    105,
                    54
                ),
        },
        {
            start:
                CONFIG.capPowerZone3End,
            end: 1,
            color:
                color(
                    216,
                    72,
                    62
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
        index <= 16;
        index += 1
    ) {
        const ratio =
            index / 16;

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
            index % 4 === 0;

        const innerRadius =
            radius *
            (
                major
                    ? 0.69
                    : 0.78
            );

        const outerRadius =
            radius * 0.91;

        stroke(
            232,
            214,
            184,
            major
                ? 150
                : 62
        );

        strokeWidth(
            major
                ? 3
                : 1.2
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
            2.0;
    } else if (
        power >=
        CONFIG.capPowerZone3End
    ) {
        jitter =
            Math.sin(
                ElapsedTime * 34
            ) *
            1.1;
    }

    const needleAngle =
        (
            baseAngle +
            jitter
        ) *
        Math.PI /
        180;

    const needleLength =
        radius * 0.68;

    stroke(
        20,
        13,
        12,
        170
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
            236,
            82,
            70,
            245
        );
    } else if (locked) {
        stroke(
            255,
            220,
            145,
            245
        );
    } else {
        stroke(
            238,
            222,
            188,
            235
        );
    }

    strokeWidth(3.2);

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
        35,
        27,
        24,
        255
    );

    ellipse(
        centerX,
        centerY,
        radius * 0.25
    );

    fill(
        205,
        180,
        144,
        255
    );

    ellipse(
        centerX,
        centerY,
        radius * 0.12
    );

    fill(
        224,
        198,
        152,
        145
    );

    fontSize(
        Math.min(
            12,
            panel.h * 0.045
        )
    );

    textAlign(CENTER);

    text(
        sliding
            ? "LOCK"
            : "TAP",
        centerX,
        panel.h * 0.14
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
            1,
            Math.ceil(
                (
                    rangeEnd -
                    rangeStart
                ) *
                12
            )
        );

    const arcRadius =
        radius * 0.96;

    stroke(
        zoneColor.r,
        zoneColor.g,
        zoneColor.b,
        active
            ? 218
            : 92
    );

    strokeWidth(
        active
            ? 5
            : 3.2
    );

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
                arcRadius,
            centerY +
                Math.sin(
                    angle1
                ) *
                arcRadius,
            centerX +
                Math.cos(
                    angle2
                ) *
                arcRadius,
            centerY +
                Math.sin(
                    angle2
                ) *
                arcRadius
        );
    }

    noStroke();
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

function normalizeMultipleGarnishList(
    values,
    fallback
) {
    const allowed = {
        lemon: true,
        cherry: true,
    };

    const seen = {};

    const add =
        function(value) {
            if (
                allowed[value]
            ) {
                seen[value] =
                    true;
            }
        };

    if (
        Array.isArray(
            values
        )
    ) {
        for (
            const value of
            values
        ) {
            add(value);
        }
    } else if (
        values &&
        typeof values === "object"
    ) {
        for (
            const value of
            Object.keys(values)
        ) {
            if (values[value]) {
                add(value);
            }
        }
    } else {
        add(values);
    }

    add(fallback);

    const result = [];

    if (seen.lemon) {
        result.push(
            "lemon"
        );
    }

    if (seen.cherry) {
        result.push(
            "cherry"
        );
    }

    return result;
}

function getCollectedGarnishes() {
    if (
        !gameState ||
        !gameState.glass
    ) {
        return [];
    }

    return normalizeMultipleGarnishList(
        gameState.glass.garnishes,
        gameState.glass.garnish
    );
}

function getResultGarnishes(
    result
) {
    const source =
        result ||
        gameState.resultData ||
        {};

    return normalizeMultipleGarnishList(
        source.garnishes,
        source.garnish
    );
}

function getPrimaryGarnish(
    garnishes
) {
    if (
        garnishes.indexOf(
            "cherry"
        ) >= 0
    ) {
        return "cherry";
    }

    if (
        garnishes.indexOf(
            "lemon"
        ) >= 0
    ) {
        return "lemon";
    }

    return null;
}

function addCollectedGarnish(
    garnish
) {
    if (
        !gameState ||
        !gameState.glass ||
        (
            garnish !== "lemon" &&
            garnish !== "cherry"
        )
    ) {
        return;
    }

    const current =
        getCollectedGarnishes();

    if (
        current.indexOf(
            garnish
        ) < 0
    ) {
        current.push(
            garnish
        );
    }

    gameState.glass.garnishes = {
        lemon:
            current.indexOf(
                "lemon"
            ) >= 0,

        cherry:
            current.indexOf(
                "cherry"
            ) >= 0,
    };

    gameState.glass.garnish =
        garnish;
}

function getVisibleBottleGarnishes() {
    const preview =
        normalizeMultipleGarnishList(
            gameState.previewGarnishes,
            gameState.previewGarnishTray
        );

    const collected =
        getCollectedGarnishes();

    const merged =
        normalizeMultipleGarnishList(
            preview.concat(
                collected
            ),
            null
        );

    const effect =
        gameState.ingredientGetEffect;

    if (
        effect &&
        effect.visible &&
        effect.kind === "garnish" &&
        effect.garnish
    ) {
        return normalizeMultipleGarnishList(
            merged.concat(
                [
                    effect.garnish,
                ]
            ),
            null
        );
    }

    return merged;
}

const startGarnishGetEffectBaseForMultipleGarnishes =
    startGarnishGetEffect;

startGarnishGetEffect = function(
    garnish,
    onComplete
) {
    startGarnishGetEffectBaseForMultipleGarnishes(
        garnish,
        function() {
            addCollectedGarnish(
                garnish
            );

            if (onComplete) {
                onComplete();
            }
        }
    );
};

const showGarnishRevealBaseForMultipleGarnishes =
    showGarnishReveal;

showGarnishReveal = function(
    garnish,
    onComplete
) {
    showGarnishRevealBaseForMultipleGarnishes(
        garnish,
        function() {
            addCollectedGarnish(
                garnish
            );

            if (onComplete) {
                onComplete();
            }
        }
    );
};

const createResultDataBaseForMultipleGarnishes =
    createResultData;

createResultData = function() {
    createResultDataBaseForMultipleGarnishes();

    if (!gameState.resultData) {
        return;
    }

    const garnishes =
        getCollectedGarnishes();

    gameState.resultData.garnishes =
        garnishes.slice();

    gameState.resultData.garnish =
        getPrimaryGarnish(
            garnishes
        );
};

const drawBottleInspectionPanelBaseForMultipleGarnishes =
    drawBottleInspectionPanel;

drawBottleInspectionPanel = function() {
    const glass =
        gameState &&
        gameState.glass
            ? gameState.glass
            : null;

    const storedGarnish =
        glass
            ? glass.garnish
            : null;

    const storedPreviewGarnishes =
        gameState.previewGarnishes;

    if (glass) {
        gameState.previewGarnishes =
            getCollectedGarnishes();

        glass.garnish =
            null;
    }

    drawBottleInspectionPanelBaseForMultipleGarnishes();

    if (glass) {
        glass.garnish =
            storedGarnish;

        gameState.previewGarnishes =
            storedPreviewGarnishes;
    }
};

drawPendingBottleGarnish = function(
    geometry
) {
    const garnishes =
        getVisibleBottleGarnishes();

    if (
        garnishes.length <= 0
    ) {
        return;
    }

    const effect =
        gameState.ingredientGetEffect;

    const activeGarnish =
        effect &&
        effect.visible &&
        effect.kind === "garnish"
            ? effect.garnish
            : null;

    const isDouble =
        garnishes.length >= 2;

    const pulse =
        1 +
        Math.sin(
            ElapsedTime * 4.6
        ) *
            0.03;

    const dishX =
        -geometry.bodyWidth *
        (
            isDouble
                ? 0.76
                : 0.72
        );

    const dishY =
        geometry.bodyTop + 22;

    const dishW =
        isDouble
            ? 35
            : 24;

    const dishH =
        isDouble
            ? 13
            : 11;

    noStroke();

    fill(
        10,
        8,
        7,
        78
    );

    ellipse(
        dishX + 2,
        dishY -
            dishH * 0.66,
        dishW * 0.90,
        dishH * 0.64
    );

    fill(
        30,
        19,
        14,
        230
    );

    ellipse(
        dishX,
        dishY,
        dishW,
        dishH
    );

    noFill();

    stroke(
        218,
        169,
        99,
        150
    );

    strokeWidth(1.4);

    ellipse(
        dishX,
        dishY,
        dishW,
        dishH
    );

    noStroke();

    fill(
        255,
        232,
        190,
        40
    );

    ellipse(
        dishX -
            dishW * 0.08,
        dishY +
            dishH * 0.10,
        dishW * 0.56,
        dishH * 0.34
    );

    const itemOffsets =
        isDouble
            ? [
                -dishW * 0.22,
                dishW * 0.22,
            ]
            : [0];

    for (
        let index = 0;
        index < garnishes.length;
        index += 1
    ) {
        const garnish =
            garnishes[index];

        const isActive =
            garnish ===
            activeGarnish;

        const scaleValue =
            (
                garnish === "cherry"
                    ? 8.4
                    : 9.0
            ) *
            (
                isActive
                    ? pulse * 1.08
                    : 0.94
            );

        drawGarnishSymbol(
            garnish,
            dishX +
                itemOffsets[index],
            dishY +
                dishH * 0.37,
            scaleValue,
            isActive
                ? 245
                : 228,
            garnish === "cherry"
                ? -16
                : 10
        );
    }

    noStroke();
    rectMode(CORNER);
    ellipseMode(CENTER);
};

getFinishedColaFeatureIds = function() {
    const result =
        gameState.resultData || {};

    const features =
        getResultGarnishes(
            result
        );

    const counts =
        result.ingredientCounts ||
        {};

    const candidates = [
        "secret_syrup",
        "lemon_peel",
        "herb",
        "cinnamon",
        "ginger",
        "vanilla",
        "caramel",
        "brown_sugar",
        "thick_syrup",
    ];

    candidates.sort(
        function(a, b) {
            const countA =
                counts[a] || 0;

            const countB =
                counts[b] || 0;

            if (
                countA !==
                countB
            ) {
                return (
                    countB -
                    countA
                );
            }

            return 0;
        }
    );

    for (
        const candidate of
        candidates
    ) {
        if (
            features.length >= 2
        ) {
            break;
        }

        if (
            (
                counts[candidate] ||
                0
            ) <= 0
        ) {
            continue;
        }

        if (
            candidate ===
                "lemon_peel" &&
            features.indexOf(
                "lemon"
            ) >= 0
        ) {
            continue;
        }

        features.push(
            candidate
        );
    }

    if (
        features.length === 0 &&
        result.topIngredientId &&
        result.topIngredientId !==
            "base_syrup" &&
        result.topIngredientId !==
            "ice"
    ) {
        features.push(
            result.topIngredientId
        );
    }

    return features.slice(
        0,
        2
    );
};

drawResultStillGarnishTray = function(
    glassX,
    glassY,
    glassScale,
    alpha
) {
    const result =
        gameState.resultData || {};

    const garnishes =
        getResultGarnishes(
            result
        );

    if (
        garnishes.length <= 0 ||
        getResultGlassDrinkKind() !==
            "none"
    ) {
        return;
    }

    const portrait =
        HEIGHT > WIDTH;

    const bottleToGlassDistance =
        portrait
            ? WIDTH * 0.265
            : WIDTH * 0.16;

    const bottleX =
        glassX -
        bottleToGlassDistance;

    const bottleScale =
        portrait
            ? Math.min(
                0.78,
                WIDTH / 490
            )
            : Math.min(
                0.78,
                HEIGHT / 520
            );

    const bottleBottomY =
        glassY -
        115 *
            glassScale;

    const isDouble =
        garnishes.length >= 2;

    const dishW =
        (
            isDouble
                ? 66
                : 54
        ) *
        bottleScale;

    const dishH =
        (
            isDouble
                ? 14
                : 12
        ) *
        bottleScale;

    const dishX =
        bottleX -
        (
            isDouble
                ? 47
                : 43
        ) *
        bottleScale;

    const dishY =
        bottleBottomY +
        dishH * 0.5;

    noStroke();

    fill(
        8,
        5,
        4,
        alpha * 0.30
    );

    ellipse(
        dishX + 2,
        dishY -
            dishH * 0.58,
        dishW * 0.92,
        dishH * 0.74
    );

    fill(
        36,
        23,
        16,
        alpha * 0.96
    );

    ellipse(
        dishX,
        dishY,
        dishW,
        dishH
    );

    noFill();

    stroke(
        227,
        179,
        105,
        alpha * 0.76
    );

    strokeWidth(
        Math.max(
            1,
            1.35 * bottleScale
        )
    );

    ellipse(
        dishX,
        dishY,
        dishW,
        dishH
    );

    noStroke();

    fill(
        255,
        237,
        198,
        alpha * 0.16
    );

    ellipse(
        dishX -
            dishW * 0.08,
        dishY +
            dishH * 0.12,
        dishW * 0.58,
        dishH * 0.34
    );

    const itemOffsets =
        isDouble
            ? [
                -dishW * 0.21,
                dishW * 0.21,
            ]
            : [0];

    for (
        let index = 0;
        index < garnishes.length;
        index += 1
    ) {
        const garnish =
            garnishes[index];

        const garnishSize =
            (
                garnish === "cherry"
                    ? 13
                    : 14
            ) *
            bottleScale;

        drawGarnishSymbol(
            garnish,
            dishX +
                itemOffsets[index],
            dishY +
                dishH * 0.42,
            garnishSize,
            alpha,
            garnish === "cherry"
                ? -16
                : 10
        );
    }

    noStroke();
    rectMode(CORNER);
    ellipseMode(CENTER);
};

const generateResultNameBaseForMultipleGarnishes =
    generateResultName;

generateResultName = function() {
    const result =
        gameState.resultData || {};

    const language =
        gameState.language;

    const name =
        generateResultNameBaseForMultipleGarnishes();

    const garnishes =
        getResultGarnishes(
            result
        );

    if (
        garnishes.length <= 0
    ) {
        return name;
    }

    const stillFinish =
        getResultGlassDrinkKind() ===
        "none";

    if (language === "ja") {
        let garnishText =
            "";

        if (
            garnishes.length >= 2
        ) {
            garnishText =
                stillFinish
                    ? "レモンとチェリー添えの"
                    : "チェリー浮かぶレモン添えの";
        } else if (
            garnishes[0] ===
            "cherry"
        ) {
            garnishText =
                stillFinish
                    ? "チェリー添えの"
                    : "チェリー浮かぶ";
        } else {
            garnishText =
                "レモン添えの";
        }

        const oldTexts = [
            "チェリー浮かぶ",
            "チェリー添えの",
            "レモン添えの",
        ];

        for (
            const oldText of
            oldTexts
        ) {
            if (
                name.indexOf(
                    oldText
                ) >= 0
            ) {
                return name.replace(
                    oldText,
                    garnishText
                );
            }
        }

        return name;
    }

    if (
        garnishes.length >= 2
    ) {
        return name.replace(
            " Cherry",
            " Cherry & Lemon"
        );
    }

    return name;
};



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

    const pressureRatio =
        CONFIG.pressureMax > 0
            ? gameState.glass.pressure /
                CONFIG.pressureMax
            : 0;

    const eventAction =
        isEventActionPhase();

    const useAnimatedTransforms =
        shouldUseGlassTokenTransforms();

    rectMode(CENTER);
    noStroke();

    fill(
        255,
        244,
        232,
        8
    );

    rect(
        0,
        0,
        topW * 0.93,
        glassH * 0.95,
        12
    );

    fill(
        80,
        38,
        20,
        28
    );

    rect(
        0,
        -glassH * 0.03,
        topW * 0.80,
        glassH * 0.88,
        12
    );

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
            token.drawY !== undefined
                ? token.drawY
                : baseY;

        const tokenX =
            useAnimatedTransforms &&
            token.drawX !== undefined
                ? token.drawX
                : 0;

        const tokenRotation =
            useAnimatedTransforms &&
            token.rot !== undefined
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
                ? 92
                : 255;

        const layerHeight =
            slotH - 6;

        pushMatrix();

        translate(
            tokenX,
            tokenY
        );

        rotate(
            tokenRotation
        );

        rectMode(CENTER);

        drawColaLayer(
            token.ingredientId,
            currentW,
            layerHeight,
            alpha,
            isTop,
            index,
            pressureRatio
        );

        if (
            isTop &&
            !eventAction
        ) {
            noFill();

            stroke(
                255,
                247,
                220,
                90 +
                    Math.sin(
                        ElapsedTime * 8
                    ) *
                        25
            );

            strokeWidth(2);

            ellipse(
                0,
                layerHeight * 0.36,
                currentW * 0.94,
                Math.max(
                    8,
                    layerHeight * 0.26
                )
            );

            noStroke();
        }

        if (
            isEventTarget &&
            (
                gameState.phase ===
                    "EVENT_WARNING" ||
                gameState.phase ===
                    "EVENT_FINISHED"
            )
        ) {
            noFill();

            stroke(
                255,
                245,
                185,
                190 +
                    Math.sin(
                        ElapsedTime * 15
                    ) *
                        40
            );

            strokeWidth(3);

            rect(
                0,
                0,
                currentW + 4,
                layerHeight + 4,
                7
            );

            noStroke();
        }

        let iconSize = 19;

        if (
            isTop &&
            !eventAction
        ) {
            iconSize +=
                Math.sin(
                    ElapsedTime * 4
                ) *
                1.5;
        }

        if (isEventTarget) {
            iconSize *= 1.08;
        }

        drawIngredientIcon(
            token.ingredientId,
            0,
            -1,
            iconSize,
            alpha * 0.88
        );

        popMatrix();
    }

    stroke(
        245,
        238,
        228,
        125
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
        255,
        248,
        235,
        42
    );

    strokeWidth(2);

    line(
        -topW * 0.24,
        glassH * 0.44,
        -bottomW * 0.18,
        -glassH * 0.40
    );

    stroke(
        255,
        248,
        235,
        20
    );

    line(
        -topW * 0.18,
        glassH * 0.36,
        -bottomW * 0.12,
        -glassH * 0.34
    );

    stroke(
        255,
        255,
        255,
        14
    );

    line(
        topW * 0.20,
        glassH * 0.28,
        bottomW * 0.12,
        -glassH * 0.24
    );

    stroke(
        245,
        238,
        228,
        18
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
        255,
        255,
        255,
        10
    );

    ellipse(
        0,
        glassH / 2 + 4,
        topW * 0.78,
        12
    );

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
                170,
                224,
                245,
                210
            );
        } else {
            fill(
                105,
                96,
                92,
                72
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


function drawCap(
  x,
  y,
  rotation,
  size,
) {
  pushMatrix();
  translate(x, y);
  rotate(rotation);

  const r = size * 0.5;
  const toothCount = 18;
  const toothStep = 360 / toothCount;
  const toothW = Math.max(
    3,
    size * 0.095,
  );
  const toothH = Math.max(
    4,
    size * 0.185,
  );

  rectMode(CENTER);
  noStroke();

  fill(
    5,
    4,
    3,
    105,
  );

  ellipse(
    size * 0.055,
    -size * 0.055,
    size * 1.07,
    size * 0.96,
  );

  fill(
    35,
    22,
    14,
  );

  for (let index = 0; index < toothCount; index += 1) {
    pushMatrix();
    rotate(index * toothStep);

    rect(
      0,
      r * 0.91,
      toothW * 1.18,
      toothH,
      Math.max(
        1.5,
        size * 0.018,
      ),
    );

    popMatrix();
  }

  for (let index = 0; index < toothCount; index += 1) {
    pushMatrix();
    rotate(index * toothStep);

    if (index >= 2 && index <= 7) {
      fill(
        214,
        157,
        78,
      );
    } else if (index >= 8 && index <= 11) {
      fill(
        149,
        91,
        43,
      );
    } else {
      fill(
        176,
        112,
        51,
      );
    }

    rect(
      0,
      r * 0.84,
      toothW,
      toothH * 0.86,
      Math.max(
        1.5,
        size * 0.016,
      ),
    );

    fill(
      80,
      48,
      25,
      145,
    );

    rect(
      0,
      r * 0.73,
      toothW * 0.48,
      toothH * 0.34,
      Math.max(
        1,
        size * 0.010,
      ),
    );

    popMatrix();
  }

  fill(
    44,
    28,
    18,
  );

  ellipse(
    0,
    0,
    size * 0.97,
  );

  fill(
    124,
    76,
    35,
  );

  ellipse(
    0,
    0,
    size * 0.89,
  );

  fill(
    211,
    153,
    72,
  );

  ellipse(
    -size * 0.018,
    size * 0.022,
    size * 0.78,
  );

  fill(
    101,
    60,
    29,
    190,
  );

  ellipse(
    size * 0.030,
    -size * 0.038,
    size * 0.72,
  );

  fill(
    190,
    130,
    56,
  );

  ellipse(
    -size * 0.018,
    size * 0.018,
    size * 0.62,
  );

  noFill();

  stroke(
    255,
    218,
    142,
    155,
  );

  strokeWidth(
    Math.max(
      1,
      size * 0.035,
    ),
  );

  ellipse(
    -size * 0.018,
    size * 0.018,
    size * 0.68,
  );

  stroke(
    61,
    35,
    21,
    185,
  );

  strokeWidth(
    Math.max(
      1,
      size * 0.026,
    ),
  );

  ellipse(
    size * 0.018,
    -size * 0.020,
    size * 0.53,
  );

  for (let index = 0; index < 12; index += 1) {
    const angle =
      index * 30;

    const rad =
      angle *
      Math.PI /
      180;

    const innerR =
      size * 0.265;

    const outerR =
      size * 0.405;

    if (index >= 2 && index <= 5) {
      stroke(
        255,
        221,
        151,
        135,
      );
    } else {
      stroke(
        72,
        43,
        25,
        120,
      );
    }

    strokeWidth(
      Math.max(
        0.8,
        size * 0.018,
      ),
    );

    line(
      Math.cos(rad) * innerR,
      Math.sin(rad) * innerR,
      Math.cos(rad) * outerR,
      Math.sin(rad) * outerR,
    );
  }

  noStroke();

  fill(
    63,
    36,
    24,
  );

  ellipse(
    0,
    0,
    size * 0.40,
  );

  fill(
    205,
    157,
    87,
  );

  ellipse(
    -size * 0.008,
    size * 0.010,
    size * 0.315,
  );

  fill(
    122,
    72,
    34,
    165,
  );

  ellipse(
    size * 0.016,
    -size * 0.020,
    size * 0.27,
  );

  noFill();

  stroke(
    94,
    51,
    33,
    165,
  );

  strokeWidth(
    Math.max(
      1,
      size * 0.014,
    ),
  );

  ellipse(
    0,
    0,
    size * 0.205,
  );

  stroke(
    83,
    35,
    28,
    210,
  );

  strokeWidth(
    Math.max(
      1,
      size * 0.012,
    ),
  );

  ellipse(
    0,
    0,
    size * 0.165,
  );

  noStroke();

  fill(
    126,
    41,
    33,
  );

  ellipse(
    0,
    0,
    size * 0.112,
  );

  fill(
    94,
    28,
    24,
    210,
  );

  ellipse(
    size * 0.010,
    -size * 0.010,
    size * 0.086,
  );

  fill(
    233,
    190,
    118,
    115,
  );

  rect(
    0,
    size * 0.003,
    size * 0.120,
    size * 0.018,
    Math.max(
      1,
      size * 0.004,
    ),
  );

  fill(
    211,
    239,
    243,
    95,
  );

  ellipse(
    -size * 0.245,
    size * 0.235,
    Math.max(
      2,
      size * 0.050,
    ),
  );

  noFill();

  stroke(
    255,
    230,
    169,
    145,
  );

  strokeWidth(
    Math.max(
      1,
      size * 0.018,
    ),
  );

  line(
    -size * 0.29,
    size * 0.18,
    -size * 0.17,
    size * 0.28,
  );

  stroke(
    42,
    23,
    17,
    120,
  );

  strokeWidth(
    Math.max(
      1,
      size * 0.020,
    ),
  );

  line(
    size * 0.20,
    -size * 0.27,
    size * 0.32,
    -size * 0.15,
  );

  rectMode(CORNER);
  noStroke();

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
