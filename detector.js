// ============================================================================
// Action Finder - Pure Hand Action Recognition Engine with MediaPipe Hands
// 21 3D Landmarks Per Hand, Dual-Hand Kinematics & Finger Extension Geometry
// Strictly recognizes EXACTLY the 29 Predefined Hand Actions or "No Action"
// Absolutely NO Random Guessing, NO Pixel Motion, NO Full-Body Fallbacks
// ============================================================================

class ActionDetector {
    constructor() {
        this.isReady = false;
        this.hands = null;
        this.lastResults = null;
        this.isProcessing = false;
        this.resolveCurrentFrame = null;

        // Temporal sliding history buffer (25 frames = ~0.8s)
        this.history = [];
        this.historyLength = 25;

        // Visual HUD State
        this.scanLineY = 0;
        this.activeAction = null;
        this.activeConfidence = 0;
        this.candidateAction = null;
        this.candidateCount = 0;

        // Debug Telemetry Data (Exposed for Debug HUD)
        this.debugTelemetry = {
            handsCount: 0,
            leftPresent: false,
            rightPresent: false,
            fingerStates: { thumb: 'Folded', index: 'Folded', middle: 'Folded', ring: 'Folded', pinky: 'Folded' },
            palmOrientation: 'None',
            handPosition: 'None',
            candidate: 'None',
            confirmed: 'No Action',
            temporalStability: '0/3',
            confidence: 0
        };

        // MediaPipe 21 Hand Landmark Indices:
        // 0: WRIST
        // 1: THUMB_CMC, 2: THUMB_MCP, 3: THUMB_IP, 4: THUMB_TIP
        // 5: INDEX_MCP, 6: INDEX_PIP, 7: INDEX_DIP, 8: INDEX_TIP
        // 9: MIDDLE_MCP, 10: MIDDLE_PIP, 11: MIDDLE_DIP, 12: MIDDLE_TIP
        // 13: RING_MCP, 14: RING_PIP, 15: RING_DIP, 16: RING_TIP
        // 17: PINKY_MCP, 18: PINKY_PIP, 19: PINKY_DIP, 20: PINKY_TIP
        this.HLM = {
            WRIST: 0,
            THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
            INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
            MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
            RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
            PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20
        };
    }

    // Initialize MediaPipe Hands model
    async initialize(onProgress) {
        try {
            if (onProgress) onProgress(20);

            // Dynamically load MediaPipe Hands script if not present
            if (typeof Hands === 'undefined') {
                await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js');
            }
            if (onProgress) onProgress(50);

            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
            });

            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
                selfieMode: false
            });

            this.hands.onResults((results) => {
                this.lastResults = results;
                if (this.resolveCurrentFrame) {
                    const cb = this.resolveCurrentFrame;
                    this.resolveCurrentFrame = null;
                    cb(results);
                }
            });

            if (onProgress) onProgress(80);
            await this.hands.initialize();

            if (onProgress) onProgress(100);
            this.isReady = true;
            console.log('MediaPipe Hands Engine Initialized Successfully (29 Hand Actions).');
            return true;
        } catch (err) {
            console.error('Failed to initialize MediaPipe Hands detector:', err);
            return false;
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            script.onload = () => resolve();
            script.onerror = (e) => reject(new Error('Failed to load script: ' + src));
            document.head.appendChild(script);
        });
    }

    // Process video frame through MediaPipe Hands
    async detectVisualFrame(video, isMirrored = true) {
        if (!this.isReady || !video || video.videoWidth === 0 || video.readyState < 2) {
            return null;
        }

        if (this.isProcessing) {
            return this.history.length > 0 ? this.history[this.history.length - 1] : null;
        }

        this.isProcessing = true;

        try {
            const resultsPromise = new Promise((resolve) => {
                this.resolveCurrentFrame = resolve;
                setTimeout(() => {
                    if (this.resolveCurrentFrame) {
                        this.resolveCurrentFrame = null;
                        resolve(null);
                    }
                }, 300);
            });

            await this.hands.send({ image: video });
            const results = await resultsPromise;

            return this.extractHandFeatures(results, isMirrored);
        } catch (err) {
            console.error('Error in hand detection frame:', err);
            return null;
        } finally {
            this.isProcessing = false;
        }
    }

    // Helper: 3D Euclidean distance
    getDistance(p1, p2) {
        if (!p1 || !p2) return 0;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z || 0) - (p2.z || 0);
        return Math.hypot(dx, dy, dz);
    }

    // Helper: 3D Joint angle at vertex b between points a-b-c
    getFingerAngle(a, b, c) {
        return this.angle3D(a, b, c);
    }

    angle3D(a, b, c) {
        if (!a || !b || !c) return 180;
        const v1 = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
        const v2 = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };

        const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        const mag1 = Math.hypot(v1.x, v1.y, v1.z);
        const mag2 = Math.hypot(v2.x, v2.y, v2.z);

        if (mag1 === 0 || mag2 === 0) return 180;
        const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        return Math.acos(cosTheta) * (180 / Math.PI);
    }

    // Helper: Calculate 2D/3D Palm Center from landmarks
    getPalmCenter(hand) {
        const lms = hand.landmarks || hand;
        const H = this.HLM;
        const wrist = lms[H.WRIST];
        const indexMcp = lms[H.INDEX_MCP];
        const middleMcp = lms[H.MIDDLE_MCP];
        const ringMcp = lms[H.RING_MCP];
        const pinkyMcp = lms[H.PINKY_MCP];

        return {
            x: (wrist.x + indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 5,
            y: (wrist.y + indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 5,
            z: ((wrist.z || 0) + (indexMcp.z || 0) + (middleMcp.z || 0) + (ringMcp.z || 0) + (pinkyMcp.z || 0)) / 5
        };
    }

    // Helper: Calculate Palm Orientation (Facing Camera, Inward, Outward, Side)
    getPalmOrientation(hand) {
        const lms = hand.landmarks || hand;
        const H = this.HLM;
        const wrist = lms[H.WRIST];
        const indexMcp = lms[H.INDEX_MCP];
        const pinkyMcp = lms[H.PINKY_MCP];

        // Vector 1: Wrist to Middle MCP (Upward along palm)
        const v1 = {
            x: lms[H.MIDDLE_MCP].x - wrist.x,
            y: lms[H.MIDDLE_MCP].y - wrist.y,
            z: (lms[H.MIDDLE_MCP].z || 0) - (wrist.z || 0)
        };

        // Vector 2: Index MCP to Pinky MCP (Across palm)
        const v2 = {
            x: pinkyMcp.x - indexMcp.x,
            y: pinkyMcp.y - indexMcp.y,
            z: (pinkyMcp.z || 0) - (indexMcp.z || 0)
        };

        // Cross product v1 x v2 gives the palm normal
        let nx = v1.y * v2.z - v1.z * v2.y;
        let ny = v1.z * v2.x - v1.x * v2.z;
        let nz = v1.x * v2.y - v1.y * v2.x;

        const mag = Math.hypot(nx, ny, nz) || 1;
        nx /= mag;
        ny /= mag;
        nz /= mag;

        // If anatomical right hand, invert normal if necessary to align
        const isRight = hand.anatomicalHand === 'Right';
        const sign = isRight ? 1 : -1;
        const facingZ = nz * sign;

        let description = 'Tilted';
        if (facingZ > 0.18) {
            description = 'Facing Camera';
        } else if (facingZ < -0.18) {
            description = 'Facing Inward';
        } else if (Math.abs(nx) > 0.45) {
            description = 'Facing Side';
        } else if (ny > 0.45) {
            description = 'Facing Down';
        } else if (ny < -0.45) {
            description = 'Facing Up';
        }

        return {
            normal: { x: nx, y: ny, z: nz },
            facingZ,
            description
        };
    }

    // Helper: Determine general hand position relative to body/head
    getHandPosition(wrist, palmCenter) {
        if (!wrist) return 'None';
        const y = wrist.y;
        const x = wrist.x;

        if (y < 0.32) return 'Elevated (High)';
        if (y < 0.42 && (x < 0.30 || x > 0.70)) return 'Near Ear / Head';
        if (y >= 0.32 && y <= 0.52 && x >= 0.35 && x <= 0.65) return 'Mouth / Face Area';
        if (y >= 0.42 && y <= 0.62) return 'Chest Level';
        if (y > 0.62) return 'Lower Torso / Desk';
        return 'Mid Range';
    }

    // ------------------------------------------------------------------------
    // Finger Extension State Functions (Extended, Folded, Partially Extended, Unknown)
    // ------------------------------------------------------------------------
    isThumbExtended(hand) {
        return this.computeThumbState(hand.landmarks || hand, hand.handScale || 0.15);
    }

    isIndexExtended(hand) {
        return this.computeFingerState(hand.landmarks || hand, this.HLM.INDEX_MCP, this.HLM.INDEX_PIP, this.HLM.INDEX_DIP, this.HLM.INDEX_TIP);
    }

    isMiddleExtended(hand) {
        return this.computeFingerState(hand.landmarks || hand, this.HLM.MIDDLE_MCP, this.HLM.MIDDLE_PIP, this.HLM.MIDDLE_DIP, this.HLM.MIDDLE_TIP);
    }

    isRingExtended(hand) {
        return this.computeFingerState(hand.landmarks || hand, this.HLM.RING_MCP, this.HLM.RING_PIP, this.HLM.RING_DIP, this.HLM.RING_TIP);
    }

    isPinkyExtended(hand) {
        return this.computeFingerState(hand.landmarks || hand, this.HLM.PINKY_MCP, this.HLM.PINKY_PIP, this.HLM.PINKY_DIP, this.HLM.PINKY_TIP);
    }

    // Compute state for 4 standard fingers (Index, Middle, Ring, Pinky)
    computeFingerState(lms, mcpIdx, pipIdx, dipIdx, tipIdx) {
        if (!lms || !lms[tipIdx] || !lms[pipIdx] || !lms[mcpIdx]) {
            return { state: 'Unknown', extended: false, angle: 0 };
        }

        const wrist = lms[this.HLM.WRIST];
        const tipDist = Math.hypot(lms[tipIdx].x - wrist.x, lms[tipIdx].y - wrist.y);
        const pipDist = Math.hypot(lms[pipIdx].x - wrist.x, lms[pipIdx].y - wrist.y);
        const mcpDist = Math.hypot(lms[mcpIdx].x - wrist.x, lms[mcpIdx].y - wrist.y);
        const angle = this.angle3D(lms[mcpIdx], lms[pipIdx], lms[dipIdx]);

        if (angle > 135 && tipDist > pipDist * 1.12 && tipDist > mcpDist * 1.25) {
            return { state: 'Extended', extended: true, angle };
        } else if (angle < 105 || tipDist < pipDist * 0.95) {
            return { state: 'Folded', extended: false, angle };
        } else {
            return { state: 'Partially Extended', extended: false, angle };
        }
    }

    // Compute thumb extension and direction
    computeThumbState(lms, scale) {
        const H = this.HLM;
        if (!lms || !lms[H.THUMB_TIP] || !lms[H.THUMB_MCP]) {
            return { state: 'Unknown', extended: false, isUp: false, isDown: false, angle: 0 };
        }

        const thumbTipToPinky = Math.hypot(lms[H.THUMB_TIP].x - lms[H.PINKY_MCP].x, lms[H.THUMB_TIP].y - lms[H.PINKY_MCP].y);
        const thumbIpToPinky = Math.hypot(lms[H.THUMB_IP].x - lms[H.PINKY_MCP].x, lms[H.THUMB_IP].y - lms[H.PINKY_MCP].y);
        const thumbDistToIndexMcp = Math.hypot(lms[H.THUMB_TIP].x - lms[H.INDEX_MCP].x, lms[H.THUMB_TIP].y - lms[H.INDEX_MCP].y);
        const thumbAngle = this.angle3D(lms[H.THUMB_CMC], lms[H.THUMB_MCP], lms[H.THUMB_IP]);

        // Direction of Thumb: vector from Thumb MCP (2) to Thumb Tip (4)
        const thumbDy = (lms[H.THUMB_TIP].y - lms[H.THUMB_MCP].y) / scale;
        const thumbDx = (lms[H.THUMB_TIP].x - lms[H.THUMB_MCP].x) / scale;
        const isThumbUp = thumbDy < -0.15 && Math.abs(thumbDx) < 0.45 && thumbDistToIndexMcp > 0.32 * scale;
        const isThumbDown = thumbDy > 0.15 && Math.abs(thumbDx) < 0.45 && thumbDistToIndexMcp > 0.32 * scale;

        let isExtended = false;
        let state = 'Folded';

        if ((thumbTipToPinky > thumbIpToPinky * 1.15 && thumbAngle > 130 && thumbDistToIndexMcp > 0.40 * scale) ||
            (isThumbUp && thumbDistToIndexMcp > 0.35 * scale) ||
            (isThumbDown && thumbDistToIndexMcp > 0.35 * scale)) {
            isExtended = true;
            state = 'Extended';
        } else if (thumbDistToIndexMcp < 0.38 * scale || thumbAngle < 125) {
            state = 'Folded';
        } else {
            state = 'Partially Extended';
        }

        return {
            state,
            extended: isExtended,
            isUp: isThumbUp,
            isDown: isThumbDown,
            angle: thumbAngle,
            thumbDy,
            thumbDx
        };
    }

    // Helper: Return comprehensive finger states for a hand
    getFingerStates(hand) {
        const lms = hand.landmarks || hand;
        const scale = hand.handScale || 0.15;

        const thumb = this.computeThumbState(lms, scale);
        const index = this.computeFingerState(lms, this.HLM.INDEX_MCP, this.HLM.INDEX_PIP, this.HLM.INDEX_DIP, this.HLM.INDEX_TIP);
        const middle = this.computeFingerState(lms, this.HLM.MIDDLE_MCP, this.HLM.MIDDLE_PIP, this.HLM.MIDDLE_DIP, this.HLM.MIDDLE_TIP);
        const ring = this.computeFingerState(lms, this.HLM.RING_MCP, this.HLM.RING_PIP, this.HLM.RING_DIP, this.HLM.RING_TIP);
        const pinky = this.computeFingerState(lms, this.HLM.PINKY_MCP, this.HLM.PINKY_PIP, this.HLM.PINKY_DIP, this.HLM.PINKY_TIP);

        let extendedCount = 0;
        if (thumb.extended) extendedCount++;
        if (index.extended) extendedCount++;
        if (middle.extended) extendedCount++;
        if (ring.extended) extendedCount++;
        if (pinky.extended) extendedCount++;

        return {
            thumb,
            index,
            middle,
            ring,
            pinky,
            extendedCount
        };
    }

    // Extract 21 landmarks, finger extension states, and kinematics for detected hands
    extractHandFeatures(results, isMirrored) {
        const now = Date.now();

        if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.debugTelemetry.handsCount = 0;
            this.debugTelemetry.leftPresent = false;
            this.debugTelemetry.rightPresent = false;
            this.debugTelemetry.fingerStates = { thumb: 'Folded', index: 'Folded', middle: 'Folded', ring: 'Folded', pinky: 'Folded' };
            this.debugTelemetry.palmOrientation = 'None';
            this.debugTelemetry.handPosition = 'None';
            this.debugTelemetry.candidate = 'None';
            this.debugTelemetry.confirmed = 'No Action';
            this.debugTelemetry.temporalStability = '0/3';
            this.debugTelemetry.confidence = 0;

            const emptyFrame = {
                time: now,
                hasHands: false,
                hands: [],
                isMirrored,
                action: this.getNoAction()
            };
            this.recordHistory(emptyFrame);
            return emptyFrame;
        }

        const rawHands = results.multiHandLandmarks;
        const handednessList = results.multiHandedness || [];
        const processedHands = [];

        for (let i = 0; i < rawHands.length; i++) {
            const lms = rawHands[i];
            const handednessMeta = handednessList[i];

            // Resolve physical anatomical handedness:
            // MediaPipe Hands with selfieMode=false:
            // "Left" label from model = user's physical RIGHT hand
            // "Right" label from model = user's physical LEFT hand
            let anatomicalHand = 'Right';
            if (handednessMeta && handednessMeta.label) {
                anatomicalHand = (handednessMeta.label === 'Left') ? 'Right' : 'Left';
            } else {
                anatomicalHand = (lms[0].x < 0.5) ? 'Right' : 'Left';
            }

            // Hand scale: distance between Wrist (0) and Middle MCP (9)
            const wrist = lms[0];
            const middleMcp = lms[9];
            const handScale = Math.max(0.08, Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y));

            // Hand Bounding Box
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            for (let j = 0; j < lms.length; j++) {
                const p = lms[j];
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }
            const pad = 0.03;
            const box = {
                x: Math.max(0, minX - pad),
                y: Math.max(0, minY - pad),
                width: Math.min(1.0, (maxX - minX) + pad * 2),
                height: Math.min(1.0, (maxY - minY) + pad * 2)
            };

            const tempHandObj = { landmarks: lms, handScale, anatomicalHand };
            const fingers = this.getFingerStates(tempHandObj);
            const palmCenter = this.getPalmCenter(tempHandObj);
            const palmOrientation = this.getPalmOrientation(tempHandObj);
            const handPosition = this.getHandPosition(wrist, palmCenter);

            processedHands.push({
                landmarks: lms,
                anatomicalHand, // 'Left' or 'Right'
                handScale,
                box,
                wrist,
                palmCenter,
                palmOrientation,
                handPosition,
                fingers
            });
        }

        // Separate Left and Right hands
        const leftHand = processedHands.find(h => h.anatomicalHand === 'Left') || null;
        const rightHand = processedHands.find(h => h.anatomicalHand === 'Right') || null;

        // Primary hand for single-hand telemetry
        const primaryHand = rightHand || leftHand || processedHands[0];

        // Update Debug Telemetry
        this.debugTelemetry.handsCount = processedHands.length;
        this.debugTelemetry.leftPresent = leftHand !== null;
        this.debugTelemetry.rightPresent = rightHand !== null;
        if (primaryHand) {
            this.debugTelemetry.fingerStates = {
                thumb: primaryHand.fingers.thumb.state,
                index: primaryHand.fingers.index.state,
                middle: primaryHand.fingers.middle.state,
                ring: primaryHand.fingers.ring.state,
                pinky: primaryHand.fingers.pinky.state
            };
            this.debugTelemetry.palmOrientation = primaryHand.palmOrientation.description;
            this.debugTelemetry.handPosition = primaryHand.handPosition;
        }

        // Previous frame velocities
        const prevFrame = this.history.length > 0 ? this.history[this.history.length - 1] : null;
        const dt = prevFrame ? Math.max(0.016, (now - prevFrame.time) / 1000) : 0.033;

        let rightWristVel = 0, leftWristVel = 0, rightWristVelX = 0, leftWristVelX = 0;
        let rightWristVelY = 0, leftWristVelY = 0;

        if (prevFrame && prevFrame.hasHands) {
            const prevR = prevFrame.hands.find(h => h.anatomicalHand === 'Right');
            const prevL = prevFrame.hands.find(h => h.anatomicalHand === 'Left');

            if (rightHand && prevR) {
                rightWristVelX = (rightHand.wrist.x - prevR.wrist.x) / (dt * rightHand.handScale);
                rightWristVelY = (rightHand.wrist.y - prevR.wrist.y) / (dt * rightHand.handScale);
                rightWristVel = Math.hypot(rightWristVelX, rightWristVelY);
            }
            if (leftHand && prevL) {
                leftWristVelX = (leftHand.wrist.x - prevL.wrist.x) / (dt * leftHand.handScale);
                leftWristVelY = (leftHand.wrist.y - prevL.wrist.y) / (dt * leftHand.handScale);
                leftWristVel = Math.hypot(leftWristVelX, leftWristVelY);
            }
        }

        const frameFeatures = {
            time: now,
            hasHands: true,
            hands: processedHands,
            leftHand,
            rightHand,
            rightWristVel,
            leftWristVel,
            rightWristVelX,
            leftWristVelX,
            rightWristVelY,
            leftWristVelY,
            isMirrored
        };

        this.recordHistory(frameFeatures);
        return frameFeatures;
    }

    recordHistory(frame) {
        this.history.push(frame);
        if (this.history.length > this.historyLength) {
            this.history.shift();
        }
    }

    // ========================================================================
    // Classify EXACTLY one of the 29 Hand Actions or return "No Action"
    // ========================================================================
    classifyAction(visual) {
        if (!visual || !visual.hasHands || visual.hands.length === 0) {
            this.candidateAction = null;
            this.candidateCount = 0;
            this.activeAction = this.getNoAction();
            this.debugTelemetry.candidate = 'None';
            this.debugTelemetry.confirmed = 'No Action';
            this.debugTelemetry.temporalStability = '0/3';
            this.debugTelemetry.confidence = 0;
            return this.activeAction;
        }

        const hist = this.history;
        const curr = visual;
        const rightHand = curr.rightHand;
        const leftHand = curr.leftHand;
        const primary = rightHand || leftHand || curr.hands[0];
        const H = this.HLM;

        // --------------------------------------------------------------------
        // Temporal Motion & Trajectory Analysis across recent frames
        // --------------------------------------------------------------------
        let rightFlipsX = 0, leftFlipsX = 0;
        let rightFlipsY = 0, leftFlipsY = 0;
        let handDistOscillations = 0;
        let fingerCurlOscillations = 0;
        let netTrajectoryZ = 0; // forward motion towards camera
        let netTrajectoryOutwardFromMouth = false;
        let netTrajectoryGoAway = false;
        let netTrajectoryEating = false;

        // Count direction flips / oscillations over last 15-20 frames
        for (let i = 2; i < hist.length; i++) {
            const h0 = hist[i - 2];
            const h1 = hist[i - 1];
            const h2 = hist[i];

            if (h0.hasHands && h1.hasHands && h2.hasHands) {
                // Right hand horizontal flips (Waving, NO)
                const r0 = h0.hands.find(h => h.anatomicalHand === 'Right');
                const r1 = h1.hands.find(h => h.anatomicalHand === 'Right');
                const r2 = h2.hands.find(h => h.anatomicalHand === 'Right');
                if (r0 && r1 && r2) {
                    const dx1 = r1.wrist.x - r0.wrist.x;
                    const dx2 = r2.wrist.x - r1.wrist.x;
                    if ((dx1 > 0.012 && dx2 < -0.012) || (dx1 < -0.012 && dx2 > 0.012)) {
                        rightFlipsX++;
                    }
                    const dy1 = r1.wrist.y - r0.wrist.y;
                    const dy2 = r2.wrist.y - r1.wrist.y;
                    if ((dy1 > 0.012 && dy2 < -0.012) || (dy1 < -0.012 && dy2 > 0.012)) {
                        rightFlipsY++;
                    }
                }

                // Left hand horizontal flips (Waving, NO)
                const l0 = h0.hands.find(h => h.anatomicalHand === 'Left');
                const l1 = h1.hands.find(h => h.anatomicalHand === 'Left');
                const l2 = h2.hands.find(h => h.anatomicalHand === 'Left');
                if (l0 && l1 && l2) {
                    const dx1 = l1.wrist.x - l0.wrist.x;
                    const dx2 = l2.wrist.x - l1.wrist.x;
                    if ((dx1 > 0.012 && dx2 < -0.012) || (dx1 < -0.012 && dx2 > 0.012)) {
                        leftFlipsX++;
                    }
                    const dy1 = l1.wrist.y - l0.wrist.y;
                    const dy2 = l2.wrist.y - l1.wrist.y;
                    if ((dy1 > 0.012 && dy2 < -0.012) || (dy1 < -0.012 && dy2 > 0.012)) {
                        leftFlipsY++;
                    }
                }

                // Two hand distance oscillation (Clapping)
                if (r0 && l0 && r1 && l1 && r2 && l2) {
                    const d0 = Math.hypot(r0.wrist.x - l0.wrist.x, r0.wrist.y - l0.wrist.y);
                    const d1 = Math.hypot(r1.wrist.x - l1.wrist.x, r1.wrist.y - l1.wrist.y);
                    const d2 = Math.hypot(r2.wrist.x - l2.wrist.x, r2.wrist.y - l2.wrist.y);
                    if ((d1 - d0 > 0.025 && d2 - d1 < -0.025) || (d1 - d0 < -0.025 && d2 - d1 > 0.025)) {
                        handDistOscillations++;
                    }
                }

                // Finger curl oscillation for Come Here (Index tip distance to wrist changing)
                const pH0 = h0.hands[0];
                const pH1 = h1.hands[0];
                const pH2 = h2.hands[0];
                if (pH0 && pH1 && pH2) {
                    const id0 = Math.hypot(pH0.landmarks[H.INDEX_TIP].x - pH0.wrist.x, pH0.landmarks[H.INDEX_TIP].y - pH0.wrist.y);
                    const id1 = Math.hypot(pH1.landmarks[H.INDEX_TIP].x - pH1.wrist.x, pH1.landmarks[H.INDEX_TIP].y - pH1.wrist.y);
                    const id2 = Math.hypot(pH2.landmarks[H.INDEX_TIP].x - pH2.wrist.x, pH2.landmarks[H.INDEX_TIP].y - pH2.wrist.y);
                    if ((id1 - id0 > 0.015 && id2 - id1 < -0.015) || (id1 - id0 < -0.015 && id2 - id1 > 0.015)) {
                        fingerCurlOscillations++;
                    }
                }
            }
        }

        // Check overall trajectory over last 8-12 frames
        if (hist.length >= 8) {
            const startH = hist[Math.max(0, hist.length - 8)];
            const endH = curr;
            if (startH.hasHands && endH.hasHands) {
                const sR = startH.hands[0];
                const eR = endH.hands[0];
                if (sR && eR) {
                    // Forward thrust toward camera (scale expansion or z drop)
                    netTrajectoryZ = (eR.handScale - sR.handScale) / sR.handScale;

                    // Thank You: Started near mouth/chin and moved outward/forward and downward
                    const startedNearChin = sR.wrist.y > 0.32 && sR.wrist.y < 0.54 && sR.wrist.x > 0.35 && sR.wrist.x < 0.65;
                    const movedAwayFromChin = (eR.wrist.y - sR.wrist.y > 0.04) || (netTrajectoryZ > 0.10);
                    if (startedNearChin && movedAwayFromChin) {
                        netTrajectoryOutwardFromMouth = true;
                    }

                    // Go Away: started close to torso, moved outward/forward away
                    const movedOutward = (Math.abs(eR.wrist.x - 0.5) > Math.abs(sR.wrist.x - 0.5) + 0.06) || (netTrajectoryZ > 0.12);
                    if (movedOutward && eR.fingers.extendedCount >= 4) {
                        netTrajectoryGoAway = true;
                    }

                    // Eating: Hand moving up towards mouth/chin or cycling vertically
                    const movedTowardsChin = (sR.wrist.y - eR.wrist.y > 0.025) && (eR.wrist.y < 0.70);
                    const movedDownFromChin = (eR.wrist.y - sR.wrist.y > 0.025) && (sR.wrist.y < 0.70);
                    if (movedTowardsChin || movedDownFromChin) {
                        netTrajectoryEating = true;
                    }
                }
            }
        }

        // Active hand flips
        const activeFlipsX = (primary === rightHand) ? rightFlipsX : leftFlipsX;
        const activeFlipsY = (primary === rightHand) ? rightFlipsY : leftFlipsY;

        // Initialize confidence scores map for all 29 Actions (IDs 1 to 29)
        const scores = {};
        for (let id = 1; id <= 29; id++) scores[id] = 0.0;

        const pF = primary ? primary.fingers : null;
        const pLms = primary ? primary.landmarks : null;
        const pScale = primary ? primary.handScale : 0.15;

        // Spatial position helpers
        const isElevated = primary && primary.wrist.y < 0.40;
        const isAtEarSide = primary && (primary.wrist.x < 0.28 || primary.wrist.x > 0.72) && primary.wrist.y > 0.18 && primary.wrist.y < 0.50;
        const activeWristVel = (primary === rightHand) ? curr.rightWristVel : curr.leftWristVel;
        
        // Comprehensive lower face / mouth / chin / neck zone
        const indexTipNearMouth = pLms && pLms[H.INDEX_TIP].y > 0.16 && pLms[H.INDEX_TIP].y < 0.70 && pLms[H.INDEX_TIP].x > 0.18 && pLms[H.INDEX_TIP].x < 0.82;
        const thumbTipNearMouth = pLms && pLms[H.THUMB_TIP].y > 0.16 && pLms[H.THUMB_TIP].y < 0.70 && pLms[H.THUMB_TIP].x > 0.18 && pLms[H.THUMB_TIP].x < 0.82;
        const middleTipNearMouth = pLms && pLms[H.MIDDLE_TIP].y > 0.16 && pLms[H.MIDDLE_TIP].y < 0.70 && pLms[H.MIDDLE_TIP].x > 0.18 && pLms[H.MIDDLE_TIP].x < 0.82;
        const wristNearMouth = primary && primary.wrist.y > 0.22 && primary.wrist.y < 0.78 && primary.wrist.x > 0.18 && primary.wrist.x < 0.82;
        const isInMouthZone = primary && (wristNearMouth || indexTipNearMouth || thumbTipNearMouth || middleTipNearMouth);

        const isHandHorizontalAtBrow = primary && pLms && Math.abs(primary.wrist.y - pLms[H.INDEX_TIP].y) < 0.14;
        const atForehead = primary && pLms && primary.wrist.y < 0.35 && pLms[H.INDEX_TIP].y < 0.30 && isHandHorizontalAtBrow;
        const isForeheadBrow = primary && pLms && primary.wrist.y < 0.35 && pLms[H.INDEX_TIP].y < 0.30 && isHandHorizontalAtBrow && (primary.wrist.x >= 0.25 && primary.wrist.x <= 0.75);
        const isStationary = primary && (curr.rightWristVel < 0.35 && curr.leftWristVel < 0.35);

        // ====================================================================
        // GESTURE RULE EVALUATIONS (Strict Deterministic Logic - NO Guessing)
        // ====================================================================

        // --------------------------------------------------------------------
        // TWO-HAND ACTIONS (Actions 3, 6, 18, 19)
        // --------------------------------------------------------------------

        // 1. ACTION 3 — RAISE BOTH HANDS
        // Both hands detected, both wrists elevated simultaneously (wrist y < 0.42)
        if (rightHand && leftHand) {
            const bothElevated = rightHand.wrist.y < 0.42 && leftHand.wrist.y < 0.42;
            if (bothElevated) {
                scores[3] = 0.98;
            }
        }

        // 2. ACTION 6 — CLAPPING
        // Two hands detected, palms facing each other, inter-wrist distance oscillates
        if (rightHand && leftHand) {
            const currentHandDist = Math.hypot(rightHand.wrist.x - leftHand.wrist.x, rightHand.wrist.y - leftHand.wrist.y);
            if (handDistOscillations >= 2 || (handDistOscillations >= 1 && currentHandDist < 0.26)) {
                scores[6] = 0.98;
            }
        }

        // 3. ACTION 19 — HAND HEART GESTURE
        // Two hands close together forming a heart: thumbs touch at bottom, index fingers touch at top,
        // but middle fingers are NOT touching flat together upright (which is Namaste)
        if (rightHand && leftHand) {
            const rL = rightHand.landmarks;
            const lL = leftHand.landmarks;
            const thumbTipDist = Math.hypot(rL[H.THUMB_TIP].x - lL[H.THUMB_TIP].x, rL[H.THUMB_TIP].y - lL[H.THUMB_TIP].y);
            const indexTipDist = Math.hypot(rL[H.INDEX_TIP].x - lL[H.INDEX_TIP].x, rL[H.INDEX_TIP].y - lL[H.INDEX_TIP].y);
            const midTipDist = Math.hypot(rL[H.MIDDLE_TIP].x - lL[H.MIDDLE_TIP].x, rL[H.MIDDLE_TIP].y - lL[H.MIDDLE_TIP].y);
            const wristsClose = Math.hypot(rightHand.wrist.x - leftHand.wrist.x, rightHand.wrist.y - leftHand.wrist.y) < 0.45;
            const isNamasteFlat = (midTipDist < 0.15 && Math.hypot(rightHand.wrist.x - leftHand.wrist.x, rightHand.wrist.y - leftHand.wrist.y) < 0.18);

            if (thumbTipDist < 0.12 && indexTipDist < 0.12 && wristsClose && !isNamasteFlat) {
                scores[19] = 0.98;
            }
        }

        // 4. ACTION 18 — TYPING GESTURE
        // Both hands low in front of torso (y > 0.48), palms down, subtle typing micro-movements
        if (rightHand && leftHand) {
            const bothLow = rightHand.wrist.y > 0.48 && leftHand.wrist.y > 0.48;
            const handSeparation = Math.hypot(rightHand.wrist.x - leftHand.wrist.x, rightHand.wrist.y - leftHand.wrist.y);
            const inTypingZone = handSeparation > 0.12 && handSeparation < 0.60;
            const microMoves = (curr.rightWristVel < 4.0 && curr.leftWristVel < 4.0);
            if (bothLow && inTypingZone && microMoves && scores[6] < 0.5 && scores[19] < 0.5) {
                scores[18] = 0.96;
            }
        }

        // 5. ACTION 28 — NAMASTE (Two Palms Pressed Together / Folded Hands 🙏)
        if (rightHand && leftHand) {
            const rL = rightHand.landmarks;
            const lL = leftHand.landmarks;
            const wristDist = Math.hypot(rightHand.wrist.x - leftHand.wrist.x, rightHand.wrist.y - leftHand.wrist.y);
            const midTipDist = Math.hypot(rL[H.MIDDLE_TIP].x - lL[H.MIDDLE_TIP].x, rL[H.MIDDLE_TIP].y - lL[H.MIDDLE_TIP].y);
            const idxTipDist = Math.hypot(rL[H.INDEX_TIP].x - lL[H.INDEX_TIP].x, rL[H.INDEX_TIP].y - lL[H.INDEX_TIP].y);
            const isUpright = (rL[H.MIDDLE_TIP].y < rightHand.wrist.y) && (lL[H.MIDDLE_TIP].y < leftHand.wrist.y);
            const inChestOrFaceZone = rightHand.wrist.y > 0.22 && rightHand.wrist.y < 0.88;

            // Two hands pressed together vertically in prayer / namaste posture
            if (wristDist < 0.20 && midTipDist < 0.16 && idxTipDist < 0.16 && isUpright && inChestOrFaceZone && handDistOscillations < 2) {
                scores[28] = 0.99;
                scores[19] = 0.0;
            }
        }

        const hasStrongTwoHand = scores[3] >= 0.85 || scores[6] >= 0.85 || scores[18] >= 0.85 || scores[19] >= 0.85 || scores[28] >= 0.85;

        // --------------------------------------------------------------------
        // DYNAMIC MOVEMENT GESTURES (Actions 4, 5, 16, 20, 21, 23, 24, 25, 26, 27, 28)
        // --------------------------------------------------------------------

        // 5. ACTION 4 — WAVING RIGHT HAND
        // Right hand elevated wide to the side, open palm, repeated horizontal oscillations
        if (rightHand && rightHand.wrist.y < 0.55 && rightHand.fingers.extendedCount >= 3 && rightFlipsX >= 2) {
            // Held laterally (wide arm wave)
            const isLateralWave = rightHand.wrist.x < 0.35 || rightHand.wrist.x > 0.65;
            if (isLateralWave) {
                scores[4] = Math.min(0.97, 0.85 + rightFlipsX * 0.05);
            }
        }

        // 6. ACTION 5 — WAVING LEFT HAND
        // Left hand elevated wide to the side, open palm, repeated horizontal oscillations
        if (leftHand && leftHand.wrist.y < 0.55 && leftHand.fingers.extendedCount >= 3 && leftFlipsX >= 2) {
            const isLateralWave = leftHand.wrist.x < 0.35 || leftHand.wrist.x > 0.65;
            if (isLateralWave) {
                scores[5] = Math.min(0.97, 0.85 + leftFlipsX * 0.05);
            }
        }

        // 7. ACTION 23 — HELLO (Greeting wave)
        // Open palm raised near face/head (x: 0.35 - 0.65, y < 0.42), gentle greeting wave (1-2 flips)
        if (primary && primary.wrist.y < 0.42 && pF && pF.extendedCount >= 4) {
            const isNearHeadFace = primary.wrist.x >= 0.32 && primary.wrist.x <= 0.68;
            if (isNearHeadFace && (activeFlipsX === 1 || activeFlipsX === 2)) {
                scores[23] = 0.94;
            }
        }

        // 8. ACTION 24 — BYE (Farewell wave)
        // Open palm elevated, continuous multi-cycle rapid horizontal wave (>= 4 flips)
        if (primary && primary.wrist.y < 0.55 && pF && pF.extendedCount >= 4) {
            if (activeFlipsX >= 4) {
                scores[24] = 0.97;
            }
        }


        // 10. ACTION 21 — NO
        // Pointing index finger WITH repeated side-to-side wagging (activeFlipsX >= 2)
        if (primary && pF && pF.index.extended && !pF.middle.extended && !pF.ring.extended && !pF.pinky.extended && !pF.thumb.isUp && !pF.thumb.isDown) {
            if (activeFlipsX >= 2) {
                scores[21] = 0.96;
            }
        }

        // 11. ACTION 25 — COME HERE
        // Palm facing inward/upward, repeated beckoning curl oscillations of fingers
        if (primary && pF && primary.palmOrientation.description === 'Facing Inward') {
            if (fingerCurlOscillations >= 2) {
                scores[25] = 0.95;
            }
        }

        // 12. ACTION 26 — GO AWAY
        // Open palm facing outward, hand starts closer to body, sweeps outward/forward away
        if (primary && pF && pF.extendedCount >= 4 && netTrajectoryGoAway) {
            scores[26] = 0.95;
        }

        // 13. ACTION 27 — STOP (Active Command)
        // Open palm with assertive forward thrust (scale expansion netTrajectoryZ > 0.08)
        if (primary && pF && pF.extendedCount === 5 && primary.palmOrientation.description === 'Facing Camera') {
            if (netTrajectoryZ > 0.08 && primary.wrist.y < 0.65) {
                scores[27] = 0.96;
            }
        }

        // 14. ACTION 28 — NAMASTE / THANK YOU
        // Single hand starts near chin/mouth and moves forward/downward away (Thank You)
        if (primary && pF && pF.extendedCount >= 3 && netTrajectoryOutwardFromMouth) {
            scores[28] = 0.96;
        }
        // Single-hand Namaste / prayer hand held upright at chest
        if (!hasStrongTwoHand && primary && pF && pF.extendedCount >= 4 && isStationary) {
            const isCenterChest = primary.wrist.x > 0.30 && primary.wrist.x < 0.70 && primary.wrist.y > 0.28 && primary.wrist.y < 0.75;
            const isPalmUpright = pLms && (pLms[H.MIDDLE_TIP].y < primary.wrist.y - 0.12 * pScale);
            const isSideFacing = primary.palmOrientation.description === 'Facing Inward' || Math.abs(primary.wrist.x - pLms[H.MIDDLE_TIP].x) < 0.08;
            if (isCenterChest && isPalmUpright && isSideFacing && !isForeheadBrow && !isAtEarSide && scores[16] < 0.5) {
                scores[28] = 0.95;
            }
        }

        // 15. ACTION 16 — EATING
        // Hand/fingertips in mouth/chin zone, gathered fingers, cupped hand, or moving in/out towards mouth
        if (!hasStrongTwoHand && isInMouthZone && pF && !isAtEarSide && !isForeheadBrow && !atForehead && !pF.thumb.isUp && !pF.thumb.isDown) {
            const rawThumbIndex = pLms ? Math.hypot(pLms[H.THUMB_TIP].x - pLms[H.INDEX_TIP].x, pLms[H.THUMB_TIP].y - pLms[H.INDEX_TIP].y) : 1.0;
            const rawThumbMid = pLms ? Math.hypot(pLms[H.THUMB_TIP].x - pLms[H.MIDDLE_TIP].x, pLms[H.THUMB_TIP].y - pLms[H.MIDDLE_TIP].y) : 1.0;
            const scaleThumbIndex = rawThumbIndex / pScale;
            const scaleThumbMid = rawThumbMid / pScale;
            const isPinchGathered = (rawThumbIndex < 0.16 || rawThumbMid < 0.16 || scaleThumbIndex < 1.20 || scaleThumbMid < 1.20);

            // Fingers gathered/cupped (not wide open flat palm)
            const isNotWideOpen = (pF.extendedCount <= 3);

            // Motion towards/around mouth or vertical cycling
            const isMovingNearMouth = (activeFlipsY >= 1 || (activeWristVel > 0.10 && activeWristVel < 3.5) || netTrajectoryEating);

            // Triggers for Eating:
            if ((isPinchGathered && isNotWideOpen) || (isNotWideOpen && isMovingNearMouth) || (isPinchGathered && isStationary) || (isNotWideOpen && isStationary)) {
                const isPointing = pF.index.extended && !pF.middle.extended && !pF.ring.extended && !pF.pinky.extended;
                const isPeace = pF.index.extended && pF.middle.extended && !pF.ring.extended && !pF.pinky.extended;
                if (!isPointing && !isPeace && !netTrajectoryOutwardFromMouth) {
                    scores[16] = 0.98;
                }
            }
        }

        // --------------------------------------------------------------------
        // STATIC ELEVATION ACTIONS (Actions 1, 2)
        // --------------------------------------------------------------------

        // 16. ACTION 1 — RAISE RIGHT HAND
        // Anatomical Right hand elevated, Left hand down/absent, stationary (not waving)
        if (!hasStrongTwoHand && rightHand && rightHand.wrist.y < 0.40 && (!leftHand || leftHand.wrist.y > 0.50)) {
            if (!isForeheadBrow && rightFlipsX < 2 && rightHand.fingers.extendedCount >= 2) {
                scores[1] = 0.96;
            }
        }

        // 17. ACTION 2 — RAISE LEFT HAND
        // Anatomical Left hand elevated, Right hand down/absent, stationary (not waving)
        if (!hasStrongTwoHand && leftHand && leftHand.wrist.y < 0.40 && (!rightHand || rightHand.wrist.y > 0.50)) {
            if (!isForeheadBrow && leftFlipsX < 2 && leftHand.fingers.extendedCount >= 2) {
                scores[2] = 0.96;
            }
        }

        // --------------------------------------------------------------------
        // STATIC FINGER / PALM SIGNS (Actions 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 22, 29)
        // --------------------------------------------------------------------
        if (!hasStrongTwoHand && primary && pF && pLms) {
            const t = pF.thumb;
            const idx = pF.index;
            const mid = pF.middle;
            const rng = pF.ring;
            const pnk = pF.pinky;

            // 18. ACTION 15 — SALUTING
            // Hand horizontally aligned at eyebrow/forehead (wrist y < 0.35, indexTip y < 0.30)
            const isHandHorizontalAtBrow = Math.abs(primary.wrist.y - pLms[H.INDEX_TIP].y) < 0.14;
            const atForehead = primary.wrist.y < 0.35 && pLms[H.INDEX_TIP].y < 0.30 && (idx.extended || mid.extended) && isHandHorizontalAtBrow;
            if (atForehead && isStationary) {
                scores[15] = 0.97;
            }

            // 19. ACTION 17 — USING PHONE GESTURE
            // Hand positioned beside ear/head (x < 0.32 or x > 0.68, y: 0.20-0.48), stable
            // Specifically a handset shape (fist at ear) or thumb+pinky shaka phone sign at ear
            const isPhoneHandShape = (!idx.extended && !mid.extended && !rng.extended && !pnk.extended) ||
                                     (t.extended && pnk.extended && !idx.extended && !mid.extended && !rng.extended);
            if (isAtEarSide && isStationary && isPhoneHandShape && !atForehead) {
                scores[17] = 0.96;
            }

            // 20. ACTION 7 — SUCCESS (THUMBS UP)
            // Thumb extended upward, other 4 fingers folded
            if (t.isUp && !idx.extended && !mid.extended && !rng.extended && !pnk.extended && !isForeheadBrow && !isAtEarSide) {
                scores[7] = 0.96;
            }

            // 21. ACTION 8 — NEGATIVE (THUMBS DOWN)
            // Thumb extended downward, remaining fingers folded
            if (t.isDown && !idx.extended && !mid.extended && !rng.extended && !pnk.extended && !isForeheadBrow && !isAtEarSide) {
                scores[8] = 0.96;
            }

            // 22. ACTION 10 — FIST
            // All 4 fingers folded into palm; thumb curled or resting on fingers; held steady anywhere
            const idxTipToMcp = Math.hypot(pLms[H.INDEX_TIP].x - pLms[H.INDEX_MCP].x, pLms[H.INDEX_TIP].y - pLms[H.INDEX_MCP].y) / pScale;
            const midTipToMcp = Math.hypot(pLms[H.MIDDLE_TIP].x - pLms[H.MIDDLE_MCP].x, pLms[H.MIDDLE_TIP].y - pLms[H.MIDDLE_MCP].y) / pScale;
            const rngTipToMcp = Math.hypot(pLms[H.RING_TIP].x - pLms[H.RING_MCP].x, pLms[H.RING_TIP].y - pLms[H.RING_MCP].y) / pScale;
            const pnkTipToMcp = Math.hypot(pLms[H.PINKY_TIP].x - pLms[H.PINKY_MCP].x, pLms[H.PINKY_TIP].y - pLms[H.PINKY_MCP].y) / pScale;
            const fingersCurled = (idxTipToMcp < 0.85) && (midTipToMcp < 0.85) && (rngTipToMcp < 0.85) && (pnkTipToMcp < 0.85);

            const thumbTipToIndexMcp = Math.hypot(pLms[H.THUMB_TIP].x - pLms[H.INDEX_MCP].x, pLms[H.THUMB_TIP].y - pLms[H.INDEX_MCP].y) / pScale;
            const thumbTipToMidMcp = Math.hypot(pLms[H.THUMB_TIP].x - pLms[H.MIDDLE_MCP].x, pLms[H.THUMB_TIP].y - pLms[H.MIDDLE_MCP].y) / pScale;
            const thumbResting = !t.isUp && !t.isDown && (!t.extended || thumbTipToIndexMcp < 0.65 || thumbTipToMidMcp < 0.65);

            if (!idx.extended && !mid.extended && !rng.extended && !pnk.extended && fingersCurled && thumbResting && !atForehead && !(isAtEarSide && isStationary) && !isInMouthZone) {
                scores[10] = 0.96;
            }

            // 23. ACTION 11 — POINTING
            // Only Index extended, Middle/Ring/Pinky folded, STRICTLY STATIONARY (not wagging NO)
            if (idx.extended && !mid.extended && !rng.extended && !pnk.extended && !t.isUp && !t.isDown && !isForeheadBrow && !isAtEarSide) {
                if (activeFlipsX < 2) {
                    scores[11] = 0.95;
                }
            }

            // 24. ACTION 13 — PEACE SIGN
            // Index & Middle extended, Ring & Pinky folded, Thumb folded/resting
            if (idx.extended && mid.extended && !rng.extended && !pnk.extended && !isForeheadBrow && !isAtEarSide) {
                scores[13] = 0.95;
            }

            // 25. ACTION 29 — LOVE YOU (ILY Sign)
            // Thumb extended, Index extended, Pinky extended, Middle & Ring folded
            if (t.extended && idx.extended && pnk.extended && !mid.extended && !rng.extended && !isForeheadBrow && !isAtEarSide) {
                scores[29] = 0.97;
            }

            // 26. ACTION 12 — OK SIGN vs ACTION 22 — OK (Communicative)
            // Thumb tip & Index tip touching (distance < 0.28 scale), other fingers extended
            const okDist = Math.hypot(pLms[H.THUMB_TIP].x - pLms[H.INDEX_TIP].x, pLms[H.THUMB_TIP].y - pLms[H.INDEX_TIP].y) / pScale;
            if (okDist < 0.28 && mid.extended && rng.extended) {
                // If fingers pointing vertically upward: OK Sign (Action 12)
                const isVerticalFingers = (pLms[H.MIDDLE_TIP].y < pLms[H.MIDDLE_MCP].y - 0.10 * pScale);
                if (isVerticalFingers && primary.wrist.y < 0.50) {
                    scores[12] = 0.96; // OK Sign (precision sign)
                } else {
                    scores[22] = 0.94; // OK (communicative gesture held forward)
                }
            }

            // 27. ACTION 14 — STOP GESTURE vs ACTION 9 — HIGH FIVE
            // All 5 fingers extended, not waving
            if (t.extended && idx.extended && mid.extended && rng.extended && pnk.extended && activeFlipsX < 2) {
                const isFacingCamera = primary.palmOrientation.description === 'Facing Camera';
                const isVerticalPalm = (pLms[H.MIDDLE_TIP].y < primary.wrist.y - 0.15 * pScale);

                if (isFacingCamera && isVerticalPalm && isStationary && primary.wrist.y >= 0.40 && primary.wrist.y < 0.65) {
                    scores[14] = 0.94; // Stop Gesture (defensive upright open palm held steady)
                } else if (!netTrajectoryGoAway && scores[27] < 0.5 && primary.wrist.y >= 0.38) {
                    scores[9] = 0.95;  // High Five (open palm facing forward)
                }
            }

            // NOTE: Finger counting completely removed per user requirements.
            // Any posture not matching the defined 29 actions cleanly falls through to No Action.
        }

        // ====================================================================
        // Find best scoring gesture with STRICT THRESHOLD (No Guessing)
        // ====================================================================
        let bestId = 0;
        let bestScore = 0;

        for (let id = 1; id <= 29; id++) {
            if (scores[id] > bestScore) {
                bestScore = scores[id];
                bestId = id;
            }
        }

        const CONFIRM_THRESHOLD = 0.72; // Strict threshold - prevents guessing!

        if (bestScore < CONFIRM_THRESHOLD || bestId === 0) {
            this.candidateAction = null;
            this.candidateCount = 0;
            this.activeAction = this.getNoAction();
            this.debugTelemetry.candidate = 'None';
            this.debugTelemetry.confirmed = 'No Action';
            this.debugTelemetry.temporalStability = '0/3';
            this.debugTelemetry.confidence = 0;
            return this.activeAction;
        }

        const candidateResult = this.createActionResult(bestId, bestScore);
        this.debugTelemetry.candidate = candidateResult.en;

        // Temporal confirmation: must persist for at least 3 consecutive frames
        if (this.candidateAction && this.candidateAction.id === bestId) {
            this.candidateCount++;
        } else {
            this.candidateAction = candidateResult;
            this.candidateCount = 1;
        }

        this.debugTelemetry.temporalStability = `${Math.min(3, this.candidateCount)}/3`;

        if (this.candidateCount >= 3) {
            this.activeAction = candidateResult;
            this.activeConfidence = bestScore;
            this.debugTelemetry.confirmed = candidateResult.en;
            this.debugTelemetry.confidence = Math.round(bestScore * 100);
        }

        return this.activeAction || this.getNoAction();
    }

    getNoAction() {
        return {
            id: 0,
            name: 'No Action',
            en: 'No Action',
            ml: 'ആക്ഷൻ ഇല്ല',
            emoji: '⏸️',
            category: 'none',
            confidence: 0
        };
    }

    createActionResult(id, confidence = 0.88) {
        let actionMeta = null;
        if (typeof getActionById === 'function') {
            actionMeta = getActionById(id);
        } else if (typeof ACTIONS !== 'undefined') {
            actionMeta = ACTIONS.find(a => a.id === id);
        }

        if (!actionMeta || id === 0) return this.getNoAction();

        return {
            ...actionMeta,
            name: actionMeta.en,
            confidence: Math.min(0.99, Math.max(0.50, confidence))
        };
    }

    // ========================================================================
    // Futuristic Hand Skeleton & Visual HUD Overlay
    // ========================================================================
    drawVisualHUD(ctx, visual, width, height, detectedAction) {
        if (width === 0 || height === 0) return;

        ctx.clearRect(0, 0, width, height);

        // 1. Dynamic Cyber Scan Line
        this.scanLineY = (this.scanLineY + 2.5) % height;
        const scanGrad = ctx.createLinearGradient(0, this.scanLineY - 8, 0, this.scanLineY + 8);
        scanGrad.addColorStop(0, 'rgba(108, 99, 255, 0)');
        scanGrad.addColorStop(0.5, 'rgba(0, 210, 255, 0.20)');
        scanGrad.addColorStop(1, 'rgba(108, 99, 255, 0)');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, this.scanLineY - 8, width, 16);

        if (!visual || !visual.hasHands || visual.hands.length === 0) {
            return;
        }

        // 2. Draw 21-point Hand Skeleton for each detected hand
        const handConnections = [
            // Thumb
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Index
            [0, 5], [5, 6], [6, 7], [7, 8],
            // Middle
            [0, 9], [9, 10], [10, 11], [11, 12],
            // Ring
            [0, 13], [13, 14], [14, 15], [15, 16],
            // Pinky
            [0, 17], [17, 18], [18, 19], [19, 20],
            // Palm base
            [5, 9], [9, 13], [13, 17]
        ];

        for (const hand of visual.hands) {
            const lms = hand.landmarks;
            const isRight = hand.anatomicalHand === 'Right';
            const boneColorA = isRight ? '#00D2FF' : '#FF6B9D';
            const boneColorB = isRight ? '#6C63FF' : '#A78BFA';

            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 6;
            ctx.shadowColor = boneColorA;

            // Connect hand bones
            for (const [i, j] of handConnections) {
                const p1 = lms[i];
                const p2 = lms[j];
                const grad = ctx.createLinearGradient(p1.x * width, p1.y * height, p2.x * width, p2.y * height);
                grad.addColorStop(0, boneColorA);
                grad.addColorStop(1, boneColorB);
                ctx.strokeStyle = grad;

                ctx.beginPath();
                ctx.moveTo(p1.x * width, p1.y * height);
                ctx.lineTo(p2.x * width, p2.y * height);
                ctx.stroke();
            }

            // Draw glowing joint dots
            for (let i = 0; i < lms.length; i++) {
                const p = lms[i];
                const px = p.x * width;
                const py = p.y * height;
                const isTip = (i === 4 || i === 8 || i === 12 || i === 16 || i === 20);

                ctx.beginPath();
                ctx.arc(px, py, isTip ? 4 : 3, 0, 2 * Math.PI);
                ctx.fillStyle = isTip ? '#4ADE80' : boneColorA;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
            }

            // Draw bounding box around hand
            const b = hand.box;
            const bx = b.x * width;
            const by = b.y * height;
            const bw = b.width * width;
            const bh = b.height * height;
            const cornerLen = Math.min(18, bw * 0.25);

            ctx.strokeStyle = (detectedAction && detectedAction.id !== 0) ? '#4ADE80' : 'rgba(108, 99, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = (detectedAction && detectedAction.id !== 0) ? 'rgba(74, 222, 128, 0.6)' : 'rgba(108, 99, 255, 0.4)';

            // Top-Left
            ctx.beginPath();
            ctx.moveTo(bx, by + cornerLen);
            ctx.lineTo(bx, by);
            ctx.lineTo(bx + cornerLen, by);
            ctx.stroke();

            // Top-Right
            ctx.beginPath();
            ctx.moveTo(bx + bw - cornerLen, by);
            ctx.lineTo(bx + bw, by);
            ctx.lineTo(bx + bw, by + cornerLen);
            ctx.stroke();

            // Bottom-Left
            ctx.beginPath();
            ctx.moveTo(bx, by + bh - cornerLen);
            ctx.lineTo(bx, by + bh);
            ctx.lineTo(bx + cornerLen, by + bh);
            ctx.stroke();

            // Bottom-Right
            ctx.beginPath();
            ctx.moveTo(bx + bw - cornerLen, by + bh);
            ctx.lineTo(bx + bw, by + bh);
            ctx.lineTo(bx + bw, by + bh - cornerLen);
            ctx.stroke();

            ctx.shadowBlur = 0;
        }

        // 3. Floating Action Target Label
        if (detectedAction && detectedAction.en) {
            const isNoAction = detectedAction.id === 0;
            const actionName = detectedAction.en;
            const actionML = detectedAction.ml || 'ആക്ഷൻ ഇല്ല';
            const confPct = detectedAction.confidence ? Math.round(detectedAction.confidence * 100) : 0;
            const displayText = isNoAction ? `⏸️ ആക്ഷൻ ഇല്ല • No Action` : `${detectedAction.emoji || '🎯'} ${actionML} | ${actionName} • ${confPct}%`;

            const tagHeight = 36;
            const tagY = 20;

            ctx.font = '700 13px "Noto Sans Malayalam", "Inter", "Outfit", sans-serif';
            const textMetrics = ctx.measureText(displayText);
            const tagWidth = textMetrics.width + 32;
            const tagX = (width - tagWidth) / 2;

            ctx.save();

            // When Mirror is ON: flip text horizontally to read normally left-to-right
            if (visual.isMirrored) {
                const centerX = tagX + tagWidth / 2;
                const centerY = tagY + tagHeight / 2;
                ctx.translate(centerX, centerY);
                ctx.scale(-1, 1);
                ctx.translate(-centerX, -centerY);
            }

            ctx.fillStyle = 'rgba(10, 10, 26, 0.94)';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 10);
            } else {
                ctx.rect(tagX, tagY, tagWidth, tagHeight);
            }
            ctx.fill();

            ctx.strokeStyle = isNoAction ? 'rgba(255, 255, 255, 0.25)' : '#4ADE80';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = isNoAction ? 'rgba(255, 255, 255, 0.7)' : '#FFFFFF';
            ctx.fillText(displayText, tagX + 16, tagY + 23);

            ctx.restore();
        }
    }
}
