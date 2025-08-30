/***********************************************************************
 * ==============             User Options             =================
 * Track End Warning
 * ---------------
 * By default, when you reach the end of the track, the jog wheel is flashing.
 * It flashes slowly when there is less than JogFlashWarningTime seconds left,
 * and quickly in the last JogFlashCriticalTime seconds.
 * You can adjust these values to suit your needs by setting the two variables below.
 * Set them to -1 if you want to completely disable flashing at the end of track.
 **************************/
const JogFlashWarningTime = 30; // number of seconds to slowly blink at the end of track
const JogFlashCriticalTime = 15; // number of seconds to quickly blink at the end of track


/************************  GPL v2 licence  *****************************
 * Reloop Beatmix 2/4 controller script
 * Author: Sébastien Blaisot <sebastien@blaisot.org>
 * Modifications: milkii
 *
 **********************************************************************
 * User References
 * ---------------
 * Wiki/manual : https://github.com/mixxxdj/mixxx/wiki/reloop-beatmix-2
 * Wiki/manual : https://github.com/mixxxdj/mixxx/wiki/Reloop-Beatmix-4
 * support forum : https://mixxx.discourse.group/t/reloop-beatmix-2-4-mapping/16049
 *
 * Thanks
 * ----------------
 * Thanks to Be.Ing for mapping review
 *
 * Revision history
 * ----------------
 * 2016-07-28 - v1.0 - Initial revision for Mixxx 2.1.0
 * 2016-07-31 - v1.1 - fix some bugs, Improved pad mapping, and lots of small improvements
 * 2016-08-13 - v1.2 - Improved jog leds
 * 2016-08-15 - v1.2.1 - fix small typos and bugs
 * 2016-08-17 - v1.3 - sync each item on the controller with Mixxx at launch
 * 2016-08-19 - v1.3.1 - fix nex/prev effect button release and superknob responsiveness
 * 2024-08-25 - v2.0.0 - Fixes & rewrites for Mixxx 2.4
 ***********************************************************************
 *                           GPL v2 licence
 *                           --------------
 * Reloop Beatmix controller script script 2.0.0 for Mixxx 2.4+
 * Copyright (C) 2016 Sébastien Blaisot
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 ***********************************************************************/
////////////////////////////////////////////////////////////////////////
// TODOs (pending work not yet tackled)
// - fx knob mapping comments vs behavior: comments disagree with runtime; align later
//     lines: 1133-1166 (handler mapping), 1153-1161 comments; action: update comments to reflect actual deck/unit behavior once confirmed on hardware
// - fx buss selection api: decide single source (twoFxUnitsMode vs currentBussConfig) and document
//     lines: 202-207 (getCurrentBussConfig), 518-527 (setTwoFxUnitsMode), 529-543 (setFxBussConfig);
//     action: finalize on currentBussConfig as source of truth and document precedence
// - extend connectControls to initialize/trigger fx units 3 and 4 for led parity
//     lines: 431-437 (only units 1/2 handled); action: mirror for units 3/4 triggers if required by skin/LEDs
// - effects initialization policy: make filter auto-load truly optional and avoid multi-pass cycleFxAssignment
//     lines: 348-378 (initializeEffects), 497-503 (init call); action: keep guarded by AutoInitializeEffects and move cycleFxAssignment outside unit loop
// - beat flashing vs load led: verify that using CHANNEL_BUTTON_NOTE for beat flash doesn’t fight load led
//     lines: 1285-1306 (setupBeatFlashing), 829-839 (deckLoaded load led); action: decide one owner or separate notes for each indicator
// - handler lifecycle: confirm makeInputHandler deregisters on reload; add explicit teardown if needed
//     lines: 1105-1166, 1161-1167 (handlers creation), 1173-1233 (PFL handlers); action: add deregistration if Mixxx retains handlers across reloads
// - remaining magic numbers: promote scratch params, cue/loop notes, and others to constants
//     lines: 795-811 (scratch/jog), 876-881 (loopDefined note 0x44), 1016-1019 (FX mode LED base already constant);
//     action: replace scattered literals with named constants
// - helper dedup: add getDeckIndex(group) to replace repeated regex/substr parsing
//     lines: 793-801, 876-881, 913-953, 955-977; action: implement helper and use everywhere deck index is parsed
// - debug controls: gate incidental console.log with a debug flag for quieter default logs
//     lines: 191-200, 505-516, and other logs; action: add ReloopBeatmix24.debug flag and guard logs





// outline: top-level objects and functions
// - ReloopBeatmix24 (object)
//   - properties:
//     - config
//     - deckEffectStates
//     - deckFxAssignments
//     - fxBussConfig
//     - id
//     - deck
//     - pflStates
//     - soloMode
//     - soloedDeck
//     - savedPflStates
//     - beatConnections
//   - functions:
//     - shouldDisableDeck(deck, unit)
//     - updateDeckEffectState(deck, unit, slot, value)
//     - syncEffectStates(deck, unit)
//     - debugEffectStates()
//     - addFxBussConfig(name, config)
//     - getCurrentBussConfig()
//     - applyFxBussAssignment(deck, assignment)
//     - cycleFxAssignment(deck, direction)
//     - debugFxAssignments()
//     - getDeckFxAssignment(deck)
//     - setDeckFxAssignment(deck, assignment)
//     - initializeEffects()
//     - TurnLEDsOff()
//     - connectControls()
//     - init(id, _debug)
//     - setTwoFxUnitsMode(enabled)
//     - setFxBussConfig(configName)
//     - resetAllFxAssignments()
//     - getFxBussMode()
//     - getMaxFxAssignment()
//     - getAllFxCombinations()
//     - getFxAssignmentDescription(assignment)
//     - shutdown()
//     - GetNextRange(previous)
//     - Range(channel, control, value, status, group)
//     - MasterSync(channel, control, value, status, group)
//     - LoopSet(channel, control, value, status, group)
//     - PitchSlider(channel, control, value, status, group)
//     - traxSelect(value, step)
//     - TraxTurn(channel, control, value, _status, _group)
//     - ShiftTraxTurn(channel, control, value, _status, _group)
//     - TraxPush(channel, control, value, _status, _group)
//     - BackButton(channel, control, value, _status, _group)
//     - LoadButtonEject(group)
//     - LoadButton(_channel, _control, value, _status, group)
//     - SamplerPad(channel, control, value, status, group)
//     - ShiftSamplerPad(channel, control, value, status, group)
//     - SamplerVol(channel, control, value, _status, _group)
//     - WheelTouch(channel, control, value, status, group)
//     - WheelTurn(channel, control, value, status, group)
//     - AllJogLEDsToggle(deck, state, step)
//     - deckLoaded(value, group, _control)
//     - SamplerPlay(value, group, _control)
//     - loopDefined(value, group, _control)
//     - ChannelPlay(value, group, _control)
//     - JogLed(value, group, _control)
//     - jogLedFlash(group, state)
//     - FxModeLedFlash(step, mode)
//     - FxModeCallback(group, mode)
//     - ActivateFx(_channel, control, value, _status, group)
//     - registerFxKnobHandlers()
//     - registerPflHandlers()
//     - setupBeatFlashing()
//     - cleanupBeatFlashing()
//     - PflButton(ch, midino, value, status, group)
//     - togglePfl(deckIndex)
//     - ShiftPflButton(ch, midino, value, status, group)
//     - enterSoloMode(deckIndex)
//     - exitSoloMode()
//     - initializePflSystem()
// - top-level constants/arrays
//   - RateRangeArray
//   - jogWheelTimers
//   - loadButtonTimers
//   - loadButtonLongPressed
//   - FxModeTimers
//   - FxModeLongPressed
//   - JogLedLit
//   - channelPlaying
//   - JogBlinking
//   - ControllerStatusSysex
////////////////////////////////////////////////////////////////////////
// JSHint configuration                                               //
////////////////////////////////////////////////////////////////////////
/* global print                                                       */
////////////////////////////////////////////////////////////////////////

// Global variables and declarations.
// ========================================================
var ReloopBeatmix24 = {};

// Configuration for FX handling
ReloopBeatmix24.config = {
    twoFxUnitsMode: false        // false = 4 FX busses, true = 2 FX busses
};

/*
 * FX Buss Assignment System - Opportunistic Pattern
 * =================================================
 * 
 * The controller uses an opportunistic pattern to support different FX buss configurations
 * without code duplication. Each configuration defines:
 * - maxValue: highest possible assignment value
 * - bussCount: number of FX busses
 * - busses: array of buss definitions with id, unit, and bit mask
 * 
 * Current configurations:
 * 
 * 2 FX Buss Mode (twoFxUnitsMode: true):
 * - Left rotary encoder: cycles deck 1 through FX buss combinations (0-3)
 * - Left rotary encoder + Shift: cycles deck 2 through FX buss combinations (0-3)
 * - Right rotary encoder: cycles deck 3 through FX buss combinations (0-3)
 * - Right rotary encoder + Shift: cycles deck 4 through FX buss combinations (0-3)
 * 
 * 4 FX Buss Mode (twoFxUnitsMode: false):
 * - Left rotary encoder: cycles deck 1 through FX buss combinations (0-15)
 * - Left rotary encoder + Shift: cycles deck 2 through FX buss combinations (0-15)
 * - Right rotary encoder: cycles deck 3 through FX buss combinations (0-15)
 * - Right rotary encoder + Shift: cycles deck 4 through FX buss combinations (0-15)
 * 
 * Binary combinations represent which FX busses receive audio from each deck:
 * - 2 buss mode: 0(00)=none, 1(01)=buss1, 2(10)=buss2, 3(11)=both
 * - 4 buss mode: 0(0000)=none, 1(0001)=buss1, 2(0010)=buss2, 3(0011)=buss1+2, etc.
 * 
 * Key Functions:
 * - ReloopBeatmix24.setTwoFxUnitsMode(true/false) - Switch between 2/4 buss modes
 * - ReloopBeatmix24.setFxBussConfig(name) - Switch to specific configuration
 * - ReloopBeatmix24.addFxBussConfig(name, config) - Add new configuration
 * - ReloopBeatmix24.getAllFxCombinations() - Get all possible combinations
 * - ReloopBeatmix24.getFxAssignmentDescription(assignment) - Human-readable description
 */

// Track effect states for each deck to determine when to disable deck
ReloopBeatmix24.deckEffectStates = {
    1: { 1: 0, 2: 0, 3: 0 }, // deck 1: effects 1, 2, 3
    2: { 1: 0, 2: 0, 3: 0 }, // deck 2: effects 1, 2, 3
    3: { 1: 0, 2: 0, 3: 0 }, // deck 3: effects 1, 2, 3
    4: { 1: 0, 2: 0, 3: 0 }  // deck 4: effects 1, 2, 3
};

// Track FX buss assignments for each deck (binary combinations)
ReloopBeatmix24.deckFxAssignments = {
    1: 0, // deck 1: 0-3 (2 busses) or 0-15 (4 busses)
    2: 0, // deck 2: 0-3 (2 busses) or 0-15 (4 busses)
    3: 0, // deck 3: 0-3 (2 busses) or 0-15 (4 busses)
    4: 0  // deck 4: 0-3 (2 busses) or 0-15 (4 busses)
};

// Helper function to check if all effects for a deck are at 0
ReloopBeatmix24.shouldDisableDeck = function(deck, unit) {
    const deckState = ReloopBeatmix24.deckEffectStates[deck];
    return deckState[1] === 0 && deckState[2] === 0 && deckState[3] === 0;
};

// Helper function to update deck effect state and enable/disable deck accordingly
ReloopBeatmix24.updateDeckEffectState = function(deck, unit, slot, value) {
    ReloopBeatmix24.deckEffectStates[deck][slot] = value;
    
    // Note: We no longer directly control deck enable states here
    // The rotary encoders control FX buss assignments, effect knobs only control effect parameters
    // Individual effects are still enabled/disabled based on their values
    
    console.log(`Deck ${deck} Effect ${slot} updated to ${value.toFixed(3)}`);
};

// Helper function to read current effect states and update tracking
ReloopBeatmix24.syncEffectStates = function(deck, unit) {
    const unitGroup = `[EffectRack1_EffectUnit${unit}]`;
    const deckGroup = `[Channel${deck}]`;
    
    // Read current meta knob values for all effects
    for (let slot = 1; slot <= 3; slot++) {
        const effectGroup = `[EffectRack1_EffectUnit${unit}_Effect${slot}]`;
        const effectLoaded = engine.getValue(effectGroup, "loaded");
        if (effectLoaded) {
            const currentValue = engine.getValue(effectGroup, "meta");
            ReloopBeatmix24.deckEffectStates[deck][slot] = currentValue;
        } else {
            ReloopBeatmix24.deckEffectStates[deck][slot] = 0;
        }
    }
    
    // Update deck enable state based on current effect states
    if (ReloopBeatmix24.shouldDisableDeck(deck, unit)) {
        engine.setValue(unitGroup, `group_${deckGroup}_enable`, 0);
    } else {
        engine.setValue(unitGroup, `group_${deckGroup}_enable`, 1);
    }
};

// Debug function to show current effect states
ReloopBeatmix24.debugEffectStates = function() {
    console.log("Current Effect States:");
    for (let deck = 1; deck <= 4; deck++) {
        const deckState = ReloopBeatmix24.deckEffectStates[deck];
        console.log(`Deck ${deck}: Effect1=${deckState[1].toFixed(3)}, Effect2=${deckState[2].toFixed(3)}, Effect3=${deckState[3].toFixed(3)}`);
    }
};

// FX Buss Configuration - opportunistic pattern for different buss counts
ReloopBeatmix24.fxBussConfig = {
    // 2 buss mode configuration
    twoBuss: {
        maxValue: 3,
        bussCount: 2,
        busses: [
            { id: 1, unit: "[EffectRack1_EffectUnit1]", bit: 1 },
            { id: 2, unit: "[EffectRack1_EffectUnit2]", bit: 2 }
        ]
    },
    // 4 buss mode configuration
    fourBuss: {
        maxValue: 15,
        bussCount: 4,
        busses: [
            { id: 1, unit: "[EffectRack1_EffectUnit1]", bit: 1 },
            { id: 2, unit: "[EffectRack1_EffectUnit2]", bit: 2 },
            { id: 3, unit: "[EffectRack1_EffectUnit3]", bit: 4 },
            { id: 4, unit: "[EffectRack1_EffectUnit4]", bit: 8 }
        ]
    }
};

// Add new FX buss configuration dynamically
ReloopBeatmix24.addFxBussConfig = function(name, config) {
    if (config.bussCount && config.maxValue && config.busses && Array.isArray(config.busses)) {
        ReloopBeatmix24.fxBussConfig[name] = config;
        console.log(`Added new FX buss configuration: ${name} (${config.bussCount} busses, max value: ${config.maxValue})`);
        return true;
    }
    console.error(`Invalid FX buss configuration: ${name}`);
    return false;
};

// Get current buss configuration
ReloopBeatmix24.getCurrentBussConfig = function() {
    return ReloopBeatmix24.config.twoFxUnitsMode ? 
        ReloopBeatmix24.fxBussConfig.twoBuss : 
        ReloopBeatmix24.fxBussConfig.fourBuss;
};

// Apply FX buss assignment to engine
ReloopBeatmix24.applyFxBussAssignment = function(deck, assignment) {
    const config = ReloopBeatmix24.getCurrentBussConfig();
    const deckGroup = `[Channel${deck}]`;
    
    // Apply each buss assignment
    config.busses.forEach(buss => {
        const enabled = (assignment & buss.bit) ? 1 : 0;
        engine.setValue(buss.unit, `group_${deckGroup}_enable`, enabled);
    });
    
    return config.busses.map(buss => ({
        id: buss.id,
        enabled: (assignment & buss.bit) ? 1 : 0
    }));
};

// Helper function to cycle through FX buss assignments
ReloopBeatmix24.cycleFxAssignment = function(deck, direction) {
    const config = ReloopBeatmix24.getCurrentBussConfig();
    const current = ReloopBeatmix24.deckFxAssignments[deck];
    
    // Calculate new value with wraparound
    let newValue;
    if (direction > 0) {
        newValue = (current + 1) % (config.maxValue + 1);
    } else {
        newValue = (current - 1 + (config.maxValue + 1)) % (config.maxValue + 1);
    }
    
    // Update assignment and apply to engine
    ReloopBeatmix24.deckFxAssignments[deck] = newValue;
    const bussStates = ReloopBeatmix24.applyFxBussAssignment(deck, newValue);
    
    // Generate debug output
    const binary = newValue.toString(2).padStart(config.bussCount, '0');
    const bussInfo = bussStates.map(buss => `FX Buss ${buss.id}:${buss.enabled}`).join(', ');
    console.log(`Deck ${deck} FX Assignment: ${newValue} (binary: ${binary}) - ${bussInfo}`);
    
    return newValue;
};

// Debug function to show current FX buss assignments
ReloopBeatmix24.debugFxAssignments = function() {
    const config = ReloopBeatmix24.getCurrentBussConfig();
    console.log(`Current FX Buss Assignments (${config.bussCount} buss mode):`);
    
    for (let deck = 1; deck <= 4; deck++) {
        const assignment = ReloopBeatmix24.deckFxAssignments[deck];
        const binary = assignment.toString(2).padStart(config.bussCount, '0');
        
        const bussStates = config.busses.map(buss => 
            `FX Buss ${buss.id}:${(assignment & buss.bit) ? 'ON' : 'OFF'}`
        ).join(', ');
        
        console.log(`Deck ${deck}: ${assignment} (binary: ${binary}) - ${bussStates}`);
    }
};

// Get current FX assignment for a specific deck
ReloopBeatmix24.getDeckFxAssignment = function(deck) {
    return ReloopBeatmix24.deckFxAssignments[deck];
};

// Set specific FX assignment for a deck (useful for testing)
ReloopBeatmix24.setDeckFxAssignment = function(deck, assignment) {
    const config = ReloopBeatmix24.getCurrentBussConfig();
    if (assignment >= 0 && assignment <= config.maxValue) {
        ReloopBeatmix24.deckFxAssignments[deck] = assignment;
        // Apply the assignment
        ReloopBeatmix24.cycleFxAssignment(deck, 0); // Direction doesn't matter here, just apply current value
        return true;
    }
    return false;
};

const RateRangeArray = [0.08, 0.10, 0.12, 0.16];

// Timers & long press state
const jogWheelTimers = [];
const loadButtonTimers = [];
const loadButtonLongPressed = [];
const FxModeTimers = [];
const FxModeLongPressed = [];



// Trax mode
// 1 for playlist mode
// 2 for track mode
// 3 for preview mode
let traxMode = 2;

// Effects mode (used by ActivateFx function)
// 1 for single effect mode, 2 for multi-effect mode
// SHIFT + long press on pitchbend +/- to change mode
let FxMode = 1; // Single effect mode by default

// Jog Led variables
// set JogFlashWarningTime and JogFlashCriticalTime to -1 to disable jog wheel flash
const JogRPM = 33.0 + 1/3; // Jog Wheel simulates a 33.3RPM turntable
const RoundTripTime = 60.0 / JogRPM; // Time in seconds for a complete turn
const JogLedNumber = 16; // number of leds (sections) on the jog wheel
const JogBaseLed = 0x3f; // Midino of last led (we count backward to turn in the right side)
const JogFlashWarningInterval = 400; // number of ms to wait when flashing slowly
const JogFlashCriticalInterval = 200; // number of ms to wait when flashing quickly

const JogLedLit = [];
const channelPlaying = []; // Keeping track of channel playing
const JogBlinking = [];

// Buttons and Led Variables
const ON = 0x7F;
const OFF = 0x00;
const RED = 0x7F;
const VIOLET = 0x2A;
const SHIFT = 0x40;
const DOWN = 0x7F;
const UP = 0x00;

// The SysEx message to send to the controller to force the midi controller
// to send the status of every item on the control surface.
const ControllerStatusSysex = [0xF0, 0x00, 0x20, 0x7F, 0x03, 0x01, 0xF7];

// Some useful regex
const channelRegEx = /\[Channel(\d+)\]/;
const samplerRegEx = /\[Sampler(\d+)\]/;

// Initialize effects for all decks
ReloopBeatmix24.initializeEffects = function() {
    // For each effect unit, ensure it has effects loaded in all three slots
    for (let unit = 1; unit <= 4; unit++) {
        const unitGroup = `[EffectRack1_EffectUnit${unit}]`;
        
        // Load effects into all three slots
        for (let slot = 1; slot <= 3; slot++) {
            const effectGroup = `[EffectRack1_EffectUnit${unit}_Effect${slot}]`;
            
            // Check if effect is loaded
            const effectLoaded = engine.getValue(effectGroup, "loaded");
            if (!effectLoaded) {
                // Load a default effect (Filter is usually available) into the specific slot
                engine.setValue(effectGroup, "effect_selector", "Filter");
            }
        }
        
        // Start with effect units disabled for all channels and sync effect states
        for (let deck = 1; deck <= 4; deck++) {
            const deckGroup = `[Channel${deck}]`;
            engine.setValue(unitGroup, `group_${deckGroup}_enable`, 0);
            // Sync effect states for this deck/unit combination
            ReloopBeatmix24.syncEffectStates(deck, unit);
        }
        
        // Initialize FX buss assignments for all decks
        for (let deck = 1; deck <= 4; deck++) {
            ReloopBeatmix24.cycleFxAssignment(deck, 0); // Set initial assignment (0 = no FX units)
        }
    }
};

// Initialise and shutdown stuff.
// ========================================================
ReloopBeatmix24.TurnLEDsOff = function() {
    // Turn all LEDS off
    let i, j;
    for (i = 0x91; i <= 0x94; i++) { // 4 decks

        // Pads
        for (j = 0x00; j <= 0x0F; j++) {
            midi.sendShortMsg(i, j, OFF);
            midi.sendShortMsg(i, j + SHIFT, OFF);
        }
        for (j = 0x10; j <= 0x1F; j++) {
            midi.sendShortMsg(i, j, OFF);
        }

        // Play/cue/cup/sync/pitch bend
        for (j = 0x20; j <= 0x25; j++) {
            midi.sendShortMsg(i, j, OFF);
            midi.sendShortMsg(i, j + SHIFT, OFF);
        }

        // Jog Wheel leds
        ReloopBeatmix24.AllJogLEDsToggle(i, OFF);

        // Load + Cue
        midi.sendShortMsg(i, 0x50, OFF);
        midi.sendShortMsg(i, 0x52, OFF);
        midi.sendShortMsg(i, 0x72, OFF);
    }
};

ReloopBeatmix24.connectControls = function() {
    let group;

    // Channels controls
    for (let i = 1; i <= 4; i++) {
        group = "[Channel" + i + "]";
        engine.makeConnection(group, "track_loaded",
            ReloopBeatmix24.deckLoaded);
        engine.trigger(group, "track_loaded");
        engine.makeConnection(group, "play",
            ReloopBeatmix24.ChannelPlay);
        engine.trigger(group, "play");
        engine.makeConnection(group, "playposition",
            ReloopBeatmix24.JogLed);
        engine.trigger(group, "playposition");
        engine.makeConnection(group, "loop_end_position",
            ReloopBeatmix24.loopDefined);
        engine.trigger(group, "loop_end_position");
        engine.softTakeover(group, "rate", true);
        engine.setValue("[EffectRack1_EffectUnit1]",
            "group_" + group + "_enable", 0);
        engine.setValue("[EffectRack1_EffectUnit2]",
            "group_" + group + "_enable", 0);
        engine.trigger("[EffectRack1_EffectUnit1]", `group_${ group }_enable`);
        engine.trigger("[EffectRack1_EffectUnit2]", `group_${ group }_enable`);
        channelPlaying[group] = !!engine.getValue(group, "play");
        JogBlinking[group] = false;

    }

    // Samplers controls
    for (let i = 1; i <= 8; i++) {
        group = "[Sampler" + i + "]";
        engine.makeConnection(group, "track_loaded",
            ReloopBeatmix24.deckLoaded);
        engine.trigger(group, "track_loaded");
        engine.makeConnection(group, "play",
            ReloopBeatmix24.SamplerPlay);
        engine.trigger(group, "play");
    }

    // Effects reset
    engine.setValue("[EffectRack1_EffectUnit1]", "group_[Master]_enable", 0);
    engine.setValue("[EffectRack1_EffectUnit2]", "group_[Master]_enable", 0);
};

ReloopBeatmix24.init = function(id, _debug) {
    ReloopBeatmix24.id = id;
    ReloopBeatmix24.TurnLEDsOff(); // Turn off all LEDs
    if (engine.getValue("[App]", "num_samplers") < 8) {
        engine.setValue("[App]", "num_samplers", 8);
    }
    ReloopBeatmix24.connectControls();

    for (let i = 1; i <= 4; i++) {
        engine.trigger("[Channel" + i + "]", "loop_end_position");
    }

    // Set up beat-synchronized flashing for channel buttons
    ReloopBeatmix24.setupBeatFlashing();

    // Initialize PFL system
    ReloopBeatmix24.initializePflSystem();

    // Register JS-based FX knob handlers (replaces XML bindings)
    try {
        ReloopBeatmix24.registerFxKnobHandlers();
    } catch (e) {
        // Silently handle registration errors
    }
    
    // register pfl/solo (shift+pfl) handlers via js (bypass xml bindings)
    try {
        ReloopBeatmix24.registerPflHandlers();
    } catch (e) {
        // ignore handler registration errors
    }
    
    // Initialize effects for all decks
    try {
        ReloopBeatmix24.initializeEffects();
    } catch (e) {
        console.log(`Error initializing effects: ${e.message}`);
    }

    // Delay controller status request to give time to the controller to be ready
    engine.beginTimer(1500,
        () => {
            console.log(`Reloop Beatmix: ${ id } Requesting Controller Status`);

            // After midi controller receive this Outbound Message request SysEx Message,
            // midi controller will send the status of every item on the
            // control surface. (Mixxx will be initialized with current values)
            midi.sendSysexMsg(ControllerStatusSysex, ControllerStatusSysex.length);

        }, true);
    console.log(`Reloop Beatmix: ${ id } initialized.`);
};

// Allow runtime toggle of 2-unit vs 4-unit mode
ReloopBeatmix24.setTwoFxUnitsMode = function(enabled) {
    ReloopBeatmix24.config = ReloopBeatmix24.config || {};
    ReloopBeatmix24.config.twoFxUnitsMode = !!enabled;
    
    // Reset all deck assignments to 0 when switching modes
    ReloopBeatmix24.resetAllFxAssignments();
    
    console.log(`Switched to ${enabled ? '2' : '4'} FX buss mode`);
};

// Switch to a specific FX buss configuration by name
ReloopBeatmix24.setFxBussConfig = function(configName) {
    if (ReloopBeatmix24.fxBussConfig[configName]) {
        // Store the current config name for future reference
        ReloopBeatmix24.config.currentBussConfig = configName;
        
        // Reset all assignments when switching configs
        ReloopBeatmix24.resetAllFxAssignments();
        
        console.log(`Switched to FX buss configuration: ${configName}`);
        return true;
    }
    console.error(`Unknown FX buss configuration: ${configName}`);
    return false;
};

// Reset all FX assignments to 0
ReloopBeatmix24.resetAllFxAssignments = function() {
    for (let deck = 1; deck <= 4; deck++) {
        ReloopBeatmix24.deckFxAssignments[deck] = 0;
        ReloopBeatmix24.cycleFxAssignment(deck, 0); // Apply the reset
    }
};

// Get current FX buss mode
ReloopBeatmix24.getFxBussMode = function() {
    return ReloopBeatmix24.config.twoFxUnitsMode ? 2 : 4;
};

// Get the maximum value for current FX buss mode
ReloopBeatmix24.getMaxFxAssignment = function() {
    return ReloopBeatmix24.getCurrentBussConfig().maxValue;
};

// Get all possible FX buss combinations for current mode
ReloopBeatmix24.getAllFxCombinations = function() {
    const config = ReloopBeatmix24.getCurrentBussConfig();
    const combinations = [];
    
    for (let i = 0; i <= config.maxValue; i++) {
        const bussStates = config.busses.map(buss => ({
            id: buss.id,
            enabled: (i & buss.bit) ? 1 : 0
        }));
        combinations.push({
            value: i,
            binary: i.toString(2).padStart(config.bussCount, '0'),
            busses: bussStates
        });
    }
    
    return combinations;
};

// Get human-readable description of an FX assignment
ReloopBeatmix24.getFxAssignmentDescription = function(assignment) {
    const config = ReloopBeatmix24.getCurrentBussConfig();
    const enabledBusses = config.busses
        .filter(buss => assignment & buss.bit)
        .map(buss => buss.id);
    
    if (enabledBusses.length === 0) return "No FX busses";
    if (enabledBusses.length === 1) return `FX Buss ${enabledBusses[0]}`;
    if (enabledBusses.length === config.bussCount) return "All FX busses";
    
    return `FX Busses ${enabledBusses.join(', ')}`;
};

ReloopBeatmix24.shutdown = function() {
    ReloopBeatmix24.cleanupBeatFlashing(); // Clean up beat connections
    ReloopBeatmix24.TurnLEDsOff(); // Turn off all LEDs
    console.log(`Reloop Beatmix: ${ ReloopBeatmix24.id } shut down.`);
};

// Button functions.
// ========================================================
ReloopBeatmix24.GetNextRange = function(previous) {
    const len = RateRangeArray.length;
    const pos = RateRangeArray.indexOf(previous);
    // If 'previous' is not found in the array, pos == -1 and (pos+1) == 0,
    // so this function will return the first element
    return RateRangeArray[(pos + 1) % len];
};

ReloopBeatmix24.Range = function(channel, control, value, status, group) {
    if (value === DOWN) {
        const oldvalue = engine.getValue(group, "rateRange");
        engine.setValue(group, "rateRange", ReloopBeatmix24.GetNextRange(
            oldvalue));
        engine.softTakeoverIgnoreNextValue(group, "rate");
    }
};

ReloopBeatmix24.MasterSync = function(channel, control, value, status, group) {
    if (value === DOWN) {
        script.toggleControl(group, "sync_enabled");
    }
};

ReloopBeatmix24.LoopSet = function(channel, control, value, status, group) {
    if (value === DOWN) {
        engine.setValue(group, "loop_in", 1);
    } else {
        engine.setValue(group, "loop_out", 1);
    }
};

ReloopBeatmix24.PitchSlider = function(channel, control, value, status, group) {
    engine.setValue(group, "rate", -script.midiPitch(control, value, status));
};

// Trax navigation functions
// ========================================================
ReloopBeatmix24.traxSelect = function(value, step) {
    switch (traxMode) {
    case 1: // Playlist mode
        for (let i = 0; i < Math.abs(value); i++) {
            for (let j = 0; j < step; j++) {
                if (value < 0) {
                    engine.setValue("[Playlist]", "SelectPrevPlaylist",
                        true);
                } else {
                    engine.setValue("[Playlist]", "SelectNextPlaylist",
                        true);
                }
            }
        }
        break;
    case 2: // Track mode
        engine.setValue("[Playlist]", "SelectTrackKnob", value * step);
        break;
    case 3: // Preview mode
        engine.setValue("[PreviewDeck1]", "playposition", Math.max(0,
            Math.min(1, engine.getValue("[PreviewDeck1]",
                "playposition") + 0.02 * value * step)));
        break;
    }
};

ReloopBeatmix24.TraxTurn = function(channel, control, value, _status, _group) {
    ReloopBeatmix24.traxSelect(value - 0x40, 1);
};

ReloopBeatmix24.ShiftTraxTurn = function(channel, control, value, _status, _group) {
    ReloopBeatmix24.traxSelect(value - 0x40, 10);
};

ReloopBeatmix24.TraxPush = function(channel, control, value, _status, _group) {
    switch (traxMode) {
    case 1: // Playlist mode
        engine.setValue("[Playlist]", "ToggleSelectedSidebarItem",
            value);
        break;
    case 2: // Track mode
        engine.setValue("[PreviewDeck1]", "LoadSelectedTrackAndPlay",
            value);
        traxMode = 3;
        break;
    case 3: // Preview mode
        if (value === DOWN) {
            script.toggleControl("[PreviewDeck1]", "play");
        }
        break;
    }
};

ReloopBeatmix24.BackButton = function(channel, control, value, _status, _group) {
    if (value === DOWN) {
        switch (traxMode) {
        case 1: // Playlist mode
            traxMode = 2; // Switch to track mode
            break;
        case 2: // Track mode
            traxMode = 1; // Switch to playlist mode
            break;
        case 3: // Preview mode
            traxMode = 2; // Switch to track mode
            break;
        }
    }
};

ReloopBeatmix24.LoadButtonEject = function(group) {
    loadButtonLongPressed[group] = true;
    engine.setValue(group, "eject", 1);
    delete loadButtonTimers[group];
};

ReloopBeatmix24.LoadButton = function(_channel, _control, value, _status, group) {
    if (value === DOWN) {
        loadButtonLongPressed[group] = false;
        loadButtonTimers[group] = engine.beginTimer(1000,
            () => { ReloopBeatmix24.LoadButtonEject(group); }, true);
    } else { // UP
        if (!loadButtonLongPressed[group]) { // Short press
            engine.stopTimer(loadButtonTimers[group]);
            delete loadButtonTimers[group];
            engine.setValue(group, "LoadSelectedTrack", 1);
        } else {
            // Set eject back to 0 to turn off the eject button on screen
            engine.setValue(group, "eject", 0);
            loadButtonLongPressed[group] = false;
        }
    }
};

// Sampler functions
// ========================================================
ReloopBeatmix24.SamplerPad = function(channel, control, value, status, group) {
    if (value === DOWN) {
        if (engine.getValue(group, "track_loaded")) { //Sampler loaded (playing or not)
            engine.setValue(group, "cue_gotoandplay", 1);
        } else {
            engine.setValue(group, "LoadSelectedTrack", 1);
        }
    }
};

ReloopBeatmix24.ShiftSamplerPad = function(channel, control, value, status,
    group) {
    if (value === DOWN) {
        if (engine.getValue(group, "track_loaded")) { //Sampler loaded (playing or not)
            if (engine.getValue(group, "play")) { // Sampler is playing
                engine.setValue(group, "cue_gotoandstop", 1);
            } else {
                engine.setValue(group, "eject", 1);
            }
        } else {
            engine.setValue(group, "LoadSelectedTrack", 1);
        }
    } else { // UP
        if (!engine.getValue(group, "track_loaded")) { // if empty
            // Set eject back to 0 to turn off the eject button on screen
            engine.setValue(group, "eject", 0);
        }
    }
};

ReloopBeatmix24.SamplerVol = function(channel, control, value, _status, _group) {
    for (let i = 1; i <= engine.getValue("[App]", "num_samplers"); i++) {
        engine.setValue("[Sampler" + i + "]", "volume", value / 127.0);
    }
};

// Jog Wheel functions
// ========================================================

ReloopBeatmix24.WheelTouch = function(channel, control, value, status, group) {
    const deck = parseInt(group.substr(8, 1), 10);
    if (value === DOWN) {
        const alpha = 1.0 / 8;
        const beta = alpha / 32;
        engine.scratchEnable(deck, 800, JogRPM, alpha, beta);
    } else {
        engine.scratchDisable(deck);
    }
};

ReloopBeatmix24.WheelTurn = function(channel, control, value, status, group) {
    const newValue = value - 64;
    const deck = parseInt(group.substr(8, 1), 10);

    // In either case, register the movement
    if (engine.isScratching(deck)) {
        engine.scratchTick(deck, newValue); // Scratch!
    } else {
        engine.setValue(group, "jog", newValue / 5); // Pitch bend
    }
};

// Led Feedback functions
// ========================================================
ReloopBeatmix24.AllJogLEDsToggle = function(deck, state, step) {
    step = typeof step !== "undefined" ? step : 1; // default value
    for (let j = 0x30; j <= 0x3F; j += step) {
        midi.sendShortMsg(deck, j, state);
    }
};
ReloopBeatmix24.deckLoaded = function(value, group, _control) {
    let i;
    switch (group.substr(1, 7)) {
    case "Channel":
        {
            const channelChan = parseInt(channelRegEx.exec(group)[1]);
            if (channelChan <= 4) {
                // shut down load button
                midi.sendShortMsg(0x90 + channelChan, 0x50,
                    value ? ON : OFF);

                // shut down jog led on unload
                if ((JogLedLit[group] !== undefined) && !value) {
                    midi.sendShortMsg(0x90 + channelChan,
                        JogBaseLed - (JogLedLit[group] + JogLedNumber - 1) %
                        JogLedNumber, OFF);
                    delete JogLedLit[group];
                    // SHIFT+PAD1 Mode A
                    midi.sendShortMsg(i, 0x48 - 1 + samplerChan, value ?
                        RED : OFF);
                    if (samplerChan <= 4) { // Handle first 4 samplers in split mode
                    // PAD5 Mode A+B (sampler 1 in split mode)
                        midi.sendShortMsg(i, 0x14 - 1 + samplerChan, value ?
                            RED : OFF);
                        // SHIFT+PAD5 Mode A+B (sampler 1 in split mode)
                        midi.sendShortMsg(i, 0x1C - 1 + samplerChan, value ?
                            RED : OFF);
                    }
                }
            }
        }
        break;
    }
};
ReloopBeatmix24.SamplerPlay = function(value, group, _control) {
    const samplerChan = parseInt(samplerRegEx.exec(group)[1]);
    if (samplerChan <= 8) { // We only handle 8 samplers (1 per pad)
        let ledColor;
        if (value) {
            ledColor = VIOLET;
        } else {
            ledColor = engine.getValue(group, "track_loaded") ? RED : OFF;
        }

        // We need to switch off pad lights before changing color otherwise
        // VIOLET to RED transition does not work well
        for (let i = 0x91; i <= 0x94; i++) {
            // PAD1 Mode A
            midi.sendShortMsg(i, 0x08 - 1 + samplerChan, OFF);
            midi.sendShortMsg(i, 0x08 - 1 + samplerChan, ledColor);
            // SHIFT+PAD1 Mode A
            midi.sendShortMsg(i, 0x48 - 1 + samplerChan, OFF);
            midi.sendShortMsg(i, 0x48 - 1 + samplerChan, ledColor);
            if (samplerChan <= 4) { // Handle first 4 samplers in split mode
                // PAD5 Mode A+B (sampler 1 in split mode)
                midi.sendShortMsg(i, 0x14 - 1 + samplerChan, OFF);
                midi.sendShortMsg(i, 0x14 - 1 + samplerChan, ledColor);
                // SHIFT+PAD5 Mode A+B (sampler 1 in split mode)
                midi.sendShortMsg(i, 0x1C - 1 + samplerChan, OFF);
                midi.sendShortMsg(i, 0x1C - 1 + samplerChan, ledColor);
            }
        }
    }
};

ReloopBeatmix24.loopDefined = function(value, group, _control) {
    const channelChan = parseInt(channelRegEx.exec(group)[1]);
    if (channelChan <= 4) {
        midi.sendShortMsg(0x90 + channelChan, 0x44, value < 0 ? OFF :
            VIOLET);
    }
};

ReloopBeatmix24.ChannelPlay = function(value, group, _control) {
    // Keep track of the playing state of each channel to avoid
    // calling engine.getValue(group, "play") too often
    if (value) {
        channelPlaying[group] = true;
    } else {
        // Stop JogWheel blinking when we stop playing and resume virtual needle
        if (JogBlinking[group]) {
            engine.stopTimer(jogWheelTimers[group]);
            delete jogWheelTimers[group];
            JogBlinking[group] = false;
            const channelChan = parseInt(channelRegEx.exec(group)[1]);
            ReloopBeatmix24.AllJogLEDsToggle(0x90 + channelChan, OFF, 2);
            engine.trigger(group, "playposition"); // light up jog position led
        }
        channelPlaying[group] = false;
    }
};

// This function will light jog led and is connected to playposition,
// so value here represent the position in the track in the range [-0.14..1.14]
// (0 = beginning, 1 = end)
ReloopBeatmix24.JogLed = function(value, group, _control) {
    if (engine.getValue(group, "track_loaded") === 0) {
        return;
    }
    // time computation
    const trackDuration = engine.getValue(group, "duration");
    const timeLeft = trackDuration * (1.0 - value);
    const channelChan = parseInt(channelRegEx.exec(group)[1]);

    // Start JogWheel blinking if playing and time left < warning time
    if (channelPlaying[group] && timeLeft <= JogFlashWarningTime) {
        if (!JogBlinking[group]) { // only if not already blinking
            // turn jog single led off
            if (JogLedLit[group] !== undefined) { // if some led on, shut it down
                midi.sendShortMsg(0x90 + channelChan,
                    JogBaseLed - (JogLedLit[group] + JogLedNumber - 1) %
                    JogLedNumber, OFF);
                delete JogLedLit[group];
            }
            // light all jog leds
            ReloopBeatmix24.AllJogLEDsToggle(0x90 + channelChan, ON, 2);
            // Set timer for shut off leds
            jogWheelTimers[group] = engine.beginTimer(
                timeLeft <= JogFlashCriticalTime ?
                    JogFlashCriticalInterval : JogFlashWarningInterval,
                () => {ReloopBeatmix24.jogLedFlash(group, ON); },
                true);
            JogBlinking[group] = true;
        }
        return;
    }

    const timePosition = trackDuration * value;
    const rotationNumber = timePosition / RoundTripTime; // number of turn since beginning
    const positionInCircle = rotationNumber - Math.floor(rotationNumber); // decimal part
    const ledToLight = Math.round(positionInCircle * JogLedNumber);
    if (JogLedLit[group] === ledToLight) { // exit if there is no change
        return;
    }
    if (JogLedLit[group] !== undefined) { // if other led on, shut it down
        midi.sendShortMsg(0x90 + channelChan,
            JogBaseLed - (JogLedLit[group] + JogLedNumber - 1) % JogLedNumber,
            OFF);
    }
    midi.sendShortMsg(0x90 + channelChan,
        JogBaseLed - (ledToLight + JogLedNumber - 1) % JogLedNumber, ON);
    JogLedLit[group] = ledToLight; // save last led lit
};

ReloopBeatmix24.jogLedFlash = function(group, state) {
    const chan = parseInt(group.substr(8, 1), 10);

    // toggle all jog leds
    ReloopBeatmix24.AllJogLEDsToggle(0x90 + chan, state ? OFF : ON, 2);

    const timeleft = engine.getValue(group, "duration") * (1.0 - engine.getValue(
        group, "playposition"));

    if (timeleft < JogFlashWarningTime) {
        // Set timer for leds shut off
        const nextTime = (timeleft < JogFlashCriticalTime ?
            JogFlashCriticalInterval : JogFlashWarningInterval);
        jogWheelTimers[group] = engine.beginTimer(nextTime,
            () => {ReloopBeatmix24.jogLedFlash(group, state ? OFF : ON); },
             true);
    } else { // Back in time ?
        // shut off all jog leds
        ReloopBeatmix24.AllJogLEDsToggle(0x90 + chan, OFF);
        delete jogWheelTimers[group];
        // JogLed callback will restart led cycling
        JogBlinking[group] = false;
    }
};

// Effects functions
// ========================================================
ReloopBeatmix24.FxModeLedFlash = function(step, mode) {
    let i;
    const ledValue = (step % 2) ? ON : OFF;
    if (step >= 7) {
        for (i = 1; i <= 4; i++) {
            // engine.trigger should be sufficient, but...
            engine.trigger("[EffectRack1_EffectUnit1]", "group_[Channel" +
                i + "]_enable");
            engine.trigger("[EffectRack1_EffectUnit2]", "group_[Channel" +
                i + "]_enable");
            // Workaround for issue #8620 as engine.trigger doesn't work well
            let newValue = engine.getValue("[EffectRack1_EffectUnit1]",
                "group_[Channel" + i + "]_enable");
            midi.sendShortMsg(0x90 + i, 0x25, newValue ? ON : OFF);
            midi.sendShortMsg(0x90 + i, 0x25 + SHIFT, newValue ? ON : OFF);
            newValue = engine.getValue("[EffectRack1_EffectUnit2]",
                "group_[Channel" + i + "]_enable");
            midi.sendShortMsg(0x90 + i, 0x24, newValue ? ON : OFF);
            midi.sendShortMsg(0x90 + i, 0x24 + SHIFT, newValue ? ON : OFF);
        }
    } else {
        for (i = 0x91; i <= 0x94; i++) {
            midi.sendShortMsg(i, 0x26 - mode, ledValue);
            midi.sendShortMsg(i, 0x26 + SHIFT - mode, ledValue);
        }
        engine.beginTimer(150, () => { ReloopBeatmix24.FxModeLedFlash(step + 1, mode); }, true);
    }
};

ReloopBeatmix24.FxModeCallback = function(group, mode) {
    FxMode = mode;
    FxModeLongPressed[group] = true;
    delete FxModeTimers[group];
    // give some visual feedback (blink led 3 times)
    for (let i = 0x91; i <= 0x94; i++) {
        midi.sendShortMsg(i, 0x26 - mode, OFF);
        midi.sendShortMsg(i, 0x26 + SHIFT - mode, OFF);
    }
    engine.beginTimer(150, () => { ReloopBeatmix24.FxModeLedFlash(1, mode); },
        true);
};

// This function activate Fx Unit 1 or 2 for the selected Channel on short press
// and toggle Fx Mode on long press (>1s)
// It is mapped to SHIFT + PITCHBEND+/- (FX1 and FX2)
ReloopBeatmix24.ActivateFx = function(_channel, control, value, _status, group) {
    // Calculate Fx num based on midi control (0x66 for Fx1 and 0x67 for Fx2)
    const FxNum = control - 0x65;
    if (value === DOWN) {
        if (FxModeTimers[group]) {
            engine.stopTimer(FxModeTimers[group]);
            delete FxModeTimers[group];
        }
        FxModeLongPressed[group] = false;
        FxModeTimers[group] = engine.beginTimer(1000,
            () => {ReloopBeatmix24.FxModeCallback(group, FxNum); }, true);
    } else { // UP
        if (FxModeLongPressed[group]) { // long press
            // Nothing to do, this has already been done in callback function
            FxModeLongPressed[group] = false;
        } else { // short press
            // stop & delete timer
            engine.stopTimer(FxModeTimers[group]);
            delete FxModeTimers[group];
            script.toggleControl("[EffectRack1_EffectUnit" + FxNum + "]",
                "group_" + group + "_enable");
        }
    }
};



// Register MIDI handlers for FX knobs (replaces XML bindings)
ReloopBeatmix24.registerFxKnobHandlers = function() {
    // Configuration - ensure it's initialized only once
    if (typeof ReloopBeatmix24.config === 'undefined') {
        ReloopBeatmix24.config = {
            twoFxUnitsMode: false  // When true: left=FX1, right=FX2; Shift only changes deck
        };
    }



    // Helper to process FX knob turns
    const processFxKnob = function(unit, slot, deck, value, control) {
        const norm = script.absoluteLin(value, 0, 1);
        // Use the proper effects framework structure - each knob controls a different effect slot
        const effectGroup = `[EffectRack1_EffectUnit${unit}_Effect${slot}]`;
        const unitGroup = `[EffectRack1_EffectUnit${unit}]`;
        const deckGroup = `[Channel${deck}]`;
        
        try {
            // Check if the effect exists and is loaded
            const effectLoaded = engine.getValue(effectGroup, "loaded");
            
            if (effectLoaded) {
                // Set the meta knob control to move the UI meta knob
                engine.setParameter(effectGroup, "meta", norm);
                // Enable the individual effect
                engine.setValue(effectGroup, "enabled", norm > 0 ? 1 : 0);
                // Update deck effect state and enable/disable deck accordingly
                ReloopBeatmix24.updateDeckEffectState(deck, unit, slot, norm);
            } else {
                // Try to load a default effect (e.g., Filter) into the specific slot
                engine.setValue(effectGroup, "effect_selector", "Filter");
                // Wait a bit and try again
                engine.beginTimer(100, () => {
                    const newEffectLoaded = engine.getValue(effectGroup, "loaded");
                    if (newEffectLoaded) {
                        engine.setParameter(effectGroup, "meta", norm);
                        engine.setValue(effectGroup, "enabled", norm > 0 ? 1 : 0);
                        // Update deck effect state and enable/disable deck accordingly
                        ReloopBeatmix24.updateDeckEffectState(deck, unit, slot, norm);
                    }
                }, true);
            }
        } catch (e) {
            // Log errors instead of silently handling them
            print(`Error in processFxKnob: ${e.message}`);
        }
    };

    // Create handler for a specific knob (left/right, slot 1-3)
    const createKnobHandler = function(side, slot, statusByte, control) {
        midi.makeInputHandler(statusByte, control, (channel, _control, value, status) => {
            const shifted = (status === 0xB2);
            const leftSide = (side === 'left');
            
            // Determine deck and unit
            let deck, unit;
            
            if (leftSide) {
                // Left side knobs: affect decks 1 and 2
                deck = shifted ? 2 : 1;
                unit = shifted ? 2 : 1;
            } else {
                // Right side knobs: affect decks 3 and 4
                deck = shifted ? 4 : 3;
                unit = shifted ? 4 : 3;
            }
            
            // In 2-unit mode, map all left knobs to FX1 and right knobs to FX2
            if (ReloopBeatmix24.config.twoFxUnitsMode) {
                unit = leftSide ? 1 : 2;
            }
            
            processFxKnob(unit, slot, deck, value, control);
            return true; // Consume the message
        });
    };

    // Left side knobs (CC 0x01, 0x02, 0x03) - affect decks 1 and 3
    createKnobHandler('left', 1, 0xB1, 0x01);  // Left knob 1 - deck 1
    createKnobHandler('left', 2, 0xB1, 0x02);  // Left knob 2 - deck 1
    createKnobHandler('left', 3, 0xB1, 0x03);  // Left knob 3 - deck 1
    
    // Left side knobs with Shift (status 0xB2) - affect deck 3
    createKnobHandler('left', 1, 0xB2, 0x01);  // Shift + Left knob 1 - deck 3
    createKnobHandler('left', 2, 0xB2, 0x02);  // Shift + Left knob 2 - deck 3
    createKnobHandler('left', 3, 0xB2, 0x03);  // Shift + Left knob 3 - deck 3

    // Right side knobs (CC 0x41, 0x42, 0x43) - affect deck 2
    createKnobHandler('right', 1, 0xB1, 0x41);  // Right knob 1 - deck 2
    createKnobHandler('right', 2, 0xB1, 0x42);  // Right knob 2 - deck 2
    createKnobHandler('right', 3, 0xB1, 0x43);  // Right knob 3 - deck 2
    
    // Right side knobs with Shift (status 0xB2) - affect deck 4
    createKnobHandler('right', 1, 0xB2, 0x41);  // Shift + Right knob 1 - deck 4
    createKnobHandler('right', 2, 0xB2, 0x42);  // Shift + Right knob 2 - deck 4
    createKnobHandler('right', 3, 0xB2, 0x43);  // Shift + Right knob 3 - deck 4

    // Register rotary encoder handlers for FX buss assignment using opportunistic pattern
    const encoderConfig = [
        { control: 0x61, status: 0xB1, deck: 1, description: "Left encoder - deck 1" },
        { control: 0x61, status: 0xB2, deck: 3, description: "Left encoder + Shift - deck 3" },
        { control: 0x71, status: 0xB1, deck: 2, description: "Right encoder - deck 2" },
        { control: 0x71, status: 0xB2, deck: 4, description: "Right encoder + Shift - deck 4" }
    ];
    
    encoderConfig.forEach(config => {
        midi.makeInputHandler(config.status, config.control, (channel, _control, value, status) => {
            const direction = value > 0x40 ? 1 : -1; // 0x41+ = clockwise, 0x3F- = counter-clockwise
            ReloopBeatmix24.cycleFxAssignment(config.deck, direction);
            return true;
        });
    });

};

// register midi handlers for pfl and shift+pfl buttons (bypass xml bindings)
ReloopBeatmix24.registerPflHandlers = function() {
    // note on status bytes per deck for channel buttons (0x91..0x94)
    const statusByDeck = [0x91, 0x92, 0x93, 0x94];
    const PFL_NOTE = 0x52;   // regular pfl button
    const SHIFT_PFL_NOTE = 0x42; // shift+pfl combo (solo)

    for (let deckIndex = 0; deckIndex < 4; deckIndex++) {
        const statusByte = statusByDeck[deckIndex];

        // regular pfl: toggle pfl for this deck
        midi.makeInputHandler(statusByte, PFL_NOTE, (channel, control, value, status) => {
            if (value !== 0) {
                ReloopBeatmix24.togglePfl(deckIndex);
            }
            return true; // consume so xml binding does not also fire
        });

        // shift+pfl: toggle solo mode for this deck
        midi.makeInputHandler(statusByte, SHIFT_PFL_NOTE, (channel, control, value, status) => {
            if (value !== 0) {
                if (ReloopBeatmix24.soloMode && ReloopBeatmix24.soloedDeck === deckIndex) {
                    ReloopBeatmix24.exitSoloMode();
                } else {
                    ReloopBeatmix24.enterSoloMode(deckIndex);
                }
            }
            return true; // consume so xml binding does not also fire
        });
    }
};

ReloopBeatmix24.ShiftFxKnobTurn = function(channel, control, value, status,
    group) {
    if (FxMode === 1) {
        const parameter = 3 + control - SHIFT;
        engine.setParameter(group, "parameter" + parameter.toString(),
            script.absoluteLin(value, 0, 1));
    } else {
        const effectUnit = parseInt(group.substr(23, 1), 10);
        const Effect = control - SHIFT;
        const storeIndex = "FX" + Effect.toString() + "U" + effectUnit.toString();
        if (storeIndex in previousValue) {
            if (value - previousValue[storeIndex] > 5) {
                engine.setValue("[EffectRack1_EffectUnit" + effectUnit +
                    "_Effect" + Effect + "]", "next_effect", 1);
                engine.setValue("[EffectRack1_EffectUnit" + effectUnit +
                    "_Effect" + Effect + "]", "next_effect", 0);
                previousValue[storeIndex] = value;
            } else if (value - previousValue[storeIndex] < -5) {
                engine.setValue("[EffectRack1_EffectUnit" + effectUnit +
                    "_Effect" + Effect + "]", "prev_effect", 1);
                engine.setValue("[EffectRack1_EffectUnit" + effectUnit +
                    "_Effect" + Effect + "]", "prev_effect", 0);
                previousValue[storeIndex] = value;
            }
        } else {
            previousValue[storeIndex] = value;
        }
    }
};

// Fx knobs send Note-Off MIDI signal when at 0 and Note-On when leaving zero.


ReloopBeatmix24.deck = ["[Channel1]", "[Channel2]", "[Channel3]", "[Channel4]"];

// PFL system state
ReloopBeatmix24.pflStates = [false, false, false, false]; // Track PFL state for each deck
ReloopBeatmix24.soloMode = false; // Whether we're in solo mode
ReloopBeatmix24.soloedDeck = -1; // Which deck is soloed (-1 = none)
ReloopBeatmix24.savedPflStates = [false, false, false, false]; // Saved PFL states before solo

// Beat-synchronized LED flashing connections
ReloopBeatmix24.beatConnections = [];

/* -------- ------------------------------------------------------
    ReloopBeatmix24.setupBeatFlashing
    Purpose: Sets up beat-synchronized flashing for channel buttons
    Input:   None
    Output:  None
    -------- ------------------------------------------------------ */
ReloopBeatmix24.setupBeatFlashing = function() {
    // Set up beat flashing for each channel
    for (let i = 0; i < 4; i++) {
        const channel = ReloopBeatmix24.deck[i];
        const statusByte = 0x91 + i; // 0x91 for Channel1, 0x92 for Channel2, etc.
        const dataByte1 = 0x50; // Channel button MIDI note
        
        // Create a simple beat connection that sends regular MIDI messages
        const connection = engine.makeConnection(channel, "beat_active", function (value) {
            if (value === 1) {
                // Beat is active - turn LED on
                midi.sendShortMsg(statusByte, dataByte1, 0x7F);
            } else {
                // Beat is not active - turn LED off
                midi.sendShortMsg(statusByte, dataByte1, 0x00);
            }
        });
        
        // Store the connection for cleanup
        ReloopBeatmix24.beatConnections.push(connection);
    }
};

/* -------- ------------------------------------------------------
    ReloopBeatmix24.cleanupBeatFlashing
    Purpose: Cleans up beat-synchronized flashing connections
    Input:   None
    Output:  None
    -------- ------------------------------------------------------ */
ReloopBeatmix24.cleanupBeatFlashing = function() {
    ReloopBeatmix24.beatConnections.forEach(function(connection) {
        if (connection) {
            connection.disconnect();
        }
    });
    
    ReloopBeatmix24.beatConnections = [];
};

/* -------- ------------------------------------------------------
    ReloopBeatmix24.PflButton
    Purpose: Handles regular PFL button presses for multi-deck monitoring
    Input:   Standard MIDI callback parameters
    Output:  None
    -------- ------------------------------------------------------ */
ReloopBeatmix24.PflButton = function(ch, midino, value, status, group) {
    if (!value) {
        return; // Only respond to button press, not release
    }
    
    // Extract deck index from group name (e.g., "[Channel1]" -> 0, "[Channel2]" -> 1, etc.)
    var deckIndex = parseInt(group.match(/\[Channel(\d+)\]/)[1]) - 1;
    
    // Regular PFL = Toggle PFL for this deck
    print("Regular PFL: Toggling deck " + (deckIndex + 1));
    ReloopBeatmix24.togglePfl(deckIndex);
};

/* -------- ------------------------------------------------------
    ReloopBeatmix24.togglePfl
    Purpose: Toggles PFL state for a specific deck
    Input:   deckIndex: index of the deck to toggle PFL for
    Output:  None
    -------- ------------------------------------------------------ */
ReloopBeatmix24.togglePfl = function(deckIndex) {
    // Exit solo mode if we're in it
    if (ReloopBeatmix24.soloMode) {
        ReloopBeatmix24.exitSoloMode();
    }
    
    // Toggle PFL state for this deck
    ReloopBeatmix24.pflStates[deckIndex] = !ReloopBeatmix24.pflStates[deckIndex];
    
    // Update the actual PFL control
    var deckGroup = ReloopBeatmix24.deck[deckIndex];
    engine.setValue(deckGroup, "pfl", ReloopBeatmix24.pflStates[deckIndex] ? 1 : 0);
    
    print("PFL " + (deckIndex + 1) + " " + (ReloopBeatmix24.pflStates[deckIndex] ? "ON" : "OFF"));
};

/* -------- ------------------------------------------------------
    ReloopBeatmix24.ShiftPflButton
    Purpose: Handles Shift+PFL button presses for solo mode
    Input:   Standard MIDI callback parameters
    Output:  None
    -------- ------------------------------------------------------ */
ReloopBeatmix24.ShiftPflButton = function(ch, midino, value, status, group) {
    if (!value) {
        return; // Only respond to button press, not release
    }
    
    // Extract deck index from group name (e.g., "[Channel1]" -> 0, "[Channel2]" -> 1, etc.)
    var deckIndex = parseInt(group.match(/\[Channel(\d+)\]/)[1]) - 1;
    
    if (ReloopBeatmix24.soloMode && ReloopBeatmix24.soloedDeck === deckIndex) {
        // If this deck is already soloed, exit solo mode
        ReloopBeatmix24.exitSoloMode();
    } else {
        // Enter solo mode for this deck
        ReloopBeatmix24.enterSoloMode(deckIndex);
    }
};

/* -------- ------------------------------------------------------
    ReloopBeatmix24.enterSoloMode
    Purpose: Enters solo mode for a specific deck (exclusive PFL)
    Input:   deckIndex: index of the deck to solo
    Output:  None
    -------- ------------------------------------------------------ */
ReloopBeatmix24.enterSoloMode = function(deckIndex) {
    // If we're already in solo mode for this deck, exit solo mode
    if (ReloopBeatmix24.soloMode && ReloopBeatmix24.soloedDeck === deckIndex) {
        ReloopBeatmix24.exitSoloMode();
        return;
    }
    
    // Save current PFL states before entering solo mode
    if (!ReloopBeatmix24.soloMode) {
        for (var i = 0; i < 4; i++) {
            ReloopBeatmix24.savedPflStates[i] = ReloopBeatmix24.pflStates[i];
        }
    }
    
    // Turn off PFL for all decks
    for (var i = 0; i < 4; i++) {
        var deckGroup = ReloopBeatmix24.deck[i];
        engine.setValue(deckGroup, "pfl", 0);
        ReloopBeatmix24.pflStates[i] = false;
    }
    
    // Turn on PFL only for the soloed deck
    var soloDeckGroup = ReloopBeatmix24.deck[deckIndex];
    engine.setValue(soloDeckGroup, "pfl", 1);
    ReloopBeatmix24.pflStates[deckIndex] = true;
    
    ReloopBeatmix24.soloMode = true;
    ReloopBeatmix24.soloedDeck = deckIndex;
    
    print("SOLO mode: Deck " + (deckIndex + 1) + " active");
};

/* -------- ------------------------------------------------------
    ReloopBeatmix24.exitSoloMode
    Purpose: Exits solo mode and restores previous PFL states
    Input:   None
    Output:  None
    -------- ------------------------------------------------------ */
ReloopBeatmix24.exitSoloMode = function() {
    if (!ReloopBeatmix24.soloMode) {
        return;
    }
    
    // Restore previous PFL states
    for (var i = 0; i < 4; i++) {
        var deckGroup = ReloopBeatmix24.deck[i];
        engine.setValue(deckGroup, "pfl", ReloopBeatmix24.savedPflStates[i] ? 1 : 0);
        ReloopBeatmix24.pflStates[i] = ReloopBeatmix24.savedPflStates[i];
    }
    
    ReloopBeatmix24.soloMode = false;
    ReloopBeatmix24.soloedDeck = -1;
    
    print("SOLO mode: Exited, PFL states restored");
};

/* -------- ------------------------------------------------------
    ReloopBeatmix24.initializePflSystem
    Purpose: Initializes the PFL system on startup
    Input:   None
    Output:  None
    -------- ------------------------------------------------------ */
ReloopBeatmix24.initializePflSystem = function() {
    // Ensure all PFL states are off initially
    for (var i = 0; i < 4; i++) {
        var deckGroup = ReloopBeatmix24.deck[i];
        engine.setValue(deckGroup, "pfl", 0);
        ReloopBeatmix24.pflStates[i] = false;
    }
    
    // Reset solo mode state
    ReloopBeatmix24.soloMode = false;
    ReloopBeatmix24.soloedDeck = -1;
    
    print("PFL system initialized");
};



/* -------- ------------------------------------------------------
    ReloopBeatmix24.toggleSolo
    Purpose: Toggles exclusive solo mode for deck headphone monitoring
             - When a deck is soloed, only that deck is heard in headphones
             - Pressing the same solo button again restores original states
             - Pressing another deck's solo button changes which deck is soloed
    Input:   deckIndex: index of the deck to toggle (0-based)
             deckGroups: array of group names (e.g. ["[Channel1]", "[Channel2]"]) 
             currentSoloState: object with soloedDeckIndex and savedStates properties
    Output:  Updated solo state object
    -------- ------------------------------------------------------ */
ReloopBeatmix24.toggleSolo = function(deckIndex, deckGroups, currentSoloState) {
    if (!currentSoloState) {
        currentSoloState = {
            soloedDeckIndex: -1,
            savedStates: []
        };
    }
    
    // Initialize savedStates array if needed
    if (!currentSoloState.savedStates || currentSoloState.savedStates.length === 0) {
        currentSoloState.savedStates = new Array(deckGroups.length).fill(0);
    }
    
    var isSoloed = deckIndex === currentSoloState.soloedDeckIndex;
    
    if (isSoloed) {
        // This deck is already soloed - restore previous PFL states
        for (var i = 0; i < deckGroups.length; i++) {
            var deckGroup = deckGroups[i];
            engine.setValue(deckGroup, "pfl", currentSoloState.savedStates[i]);
        }
        currentSoloState.soloedDeckIndex = -1; // Exit solo mode
    } else {
        // Solo this deck
        if (currentSoloState.soloedDeckIndex === -1) {
            // First time soloing - save current PFL states
            for (var i = 0; i < deckGroups.length; i++) {
                var deckGroup = deckGroups[i];
                currentSoloState.savedStates[i] = engine.getValue(deckGroup, "pfl");
                // Set PFL on for selected deck only
                engine.setValue(deckGroup, "pfl", i === deckIndex);
            }
        } else {
            // Already in solo mode - just change which deck is soloed
            for (var i = 0; i < deckGroups.length; i++) {
                var deckGroup = deckGroups[i];
                engine.setValue(deckGroup, "pfl", i === deckIndex);
            }
        }
        currentSoloState.soloedDeckIndex = deckIndex;
    }
    
    return currentSoloState;
};

/* -------- ------------------------------------------------------
    ReloopBeatmix24.solo
    Purpose: MIDI callback for toggling exclusive solo mode
    Input:   Standard MIDI callback parameters
    Output:  None
    -------- ------------------------------------------------------ */
ReloopBeatmix24.solo = function(ch, midino, value, status, group) {
    if (!value) {
        return; // Only respond to button press, not release
    }
    
    // Extract deck index from group name (e.g., "[Channel1]" -> 0, "[Channel2]" -> 1, etc.)
    var deckIndex = parseInt(group.match(/\[Channel(\d+)\]/)[1]) - 1;
    
    // Use the generic ReloopBeatmix24.toggleSolo function with our controller-specific state
    var soloState = {
        soloedDeckIndex: ReloopBeatmix24.currentlySoloedDeck,
        savedStates: ReloopBeatmix24.pflNowList
    };
    
    soloState = ReloopBeatmix24.toggleSolo(deckIndex, ReloopBeatmix24.deck, soloState);
    
    // Update our controller-specific state
    ReloopBeatmix24.currentlySoloedDeck = soloState.soloedDeckIndex;
    ReloopBeatmix24.pflNowList = soloState.savedStates;
};


