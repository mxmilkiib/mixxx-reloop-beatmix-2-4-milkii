# Reloop Beatmix 2/4 Controller
A customised fork by milkii

A customised controller mapping for the Reloop Beatmix 2/4 DJ controller, built on top of Sébastien Blaisot's original mapping with significant enhancements and improvements.

## Overview

This controller mapping provides enhanced functionality for the Reloop Beatmix 2/4, including advanced FX management, intelligent MIDI processing, beat-synchronized LED flashing, and robust state management. The original script has been extended from 782 lines to 1318 lines with sophisticated new features and comprehensive improvements.

## Features

### Core Controller Functions
- **4-Channel DJ Control**: Full control over 4 decks with individual hotcue pads, jog wheels, and transport controls
- **8 Sampler Pads**: Dedicated sampler controls with visual feedback
- **Jog Wheel LED Display**: Position indicator with end-of-track warning flashing
- **Pitch Control**: Precise tempo control with range selection
- **Loop Controls**: In/out loop setting with visual indicators

### Advanced FX System
- **Flexible FX Unit Configuration**: Support for both 2-unit and 4-unit FX modes
- **Pattern-Based FX Management**: Sophisticated buss assignment system with opportunistic configuration
- **Smart FX Knob Handling**: JavaScript-based MIDI processing with automatic effect loading
- **Auto-Enable/Disable**: Effects automatically turn on/off based on knob position
- **Shift Key Support**: Access to additional decks (3/4) when shift is held
- **Automatic Effect Loading**: Empty FX slots automatically load default effects

### Beat Synchronization
- **Channel Button Flashing**: Beat-synchronized LED flashing for active channels
- **Visual Beat Feedback**: Real-time visual indication of beat timing
- **Proper Resource Management**: Clean connection handling and cleanup

### Advanced Features
- **Solo Mode**: Exclusive headphone monitoring with state preservation
- **Long Press Support**: Extended functionality for load buttons and FX mode switching
- **Soft Takeover**: Prevents parameter jumping when switching tracks
- **Comprehensive LED Feedback**: Visual status for all controller elements
- **State Management**: Robust tracking and synchronization of effect states

## Installation

1. Copy the controller files to your Mixxx controllers directory:
   ```bash
   cp -r Reloop-Beatmix-2-4-milkii /usr/share/mixxx/controllers/
   ```

2. Restart Mixxx

3. In Mixxx preferences, go to Controllers and add the "Reloop Beatmix 2/4 - milkii" mapping

## Configuration

### FX Mode Selection
The controller supports two FX operating modes:

- **4-Unit Mode (Default)**: Each deck has its own dedicated FX unit
  - Left knobs: FX1/FX3 (decks 1/3)
  - Right knobs: FX2/FX4 (decks 2/4)
  - Shift + knob: Access decks 3/4

- **2-Unit Mode**: Shared FX units across decks
  - Left knobs: FX1 (decks 1/3)
  - Right knobs: FX2 (decks 2/4)
  - Shift + knob: Access decks 3/4

To toggle between modes, use the runtime function:
```javascript
ReloopBeatmix24.setTwoFxUnitsMode(true);  // Enable 2-unit mode
ReloopBeatmix24.setTwoFxUnitsMode(false); // Enable 4-unit mode
```

### FX Buss Configuration
Switch between predefined FX configurations:
```javascript
ReloopBeatmix24.setFxBussConfig("twoBuss");   // Switch to 2-unit mode
ReloopBeatmix24.setFxBussConfig("fourBuss");  // Switch to 4-unit mode
```

### Custom FX Configurations
Create custom FX buss configurations:
```javascript
ReloopBeatmix24.addFxBussConfig("custom", {
    maxValue: 7,
    bussCount: 3,
    busses: [
        { id: 1, unit: 1, bitMask: 0x01 },
        { id: 2, unit: 2, bitMask: 0x02 },
        { id: 3, unit: 3, bitMask: 0x04 }
    ]
});
```

### Jog Wheel Warning Times
Customize the end-of-track warning behavior:
```javascript
const JogFlashWarningTime = 30;  // Seconds before end to start slow flashing
const JogFlashCriticalTime = 15; // Seconds before end to start fast flashing
```

## Controller Layout

### Left Side (Decks 1/3)
- **Hotcue Pads**: 4 pads per deck for cue points
- **Transport Controls**: Play, Cue, Sync, Pitch bend
- **FX Knobs**: 3 knobs controlling effect parameters with automatic loading
- **Jog Wheel**: Touch-sensitive with LED position indicator

### Right Side (Decks 2/4)
- **Hotcue Pads**: 4 pads per deck for cue points
- **Transport Controls**: Play, Cue, Sync, Pitch bend
- **FX Knobs**: 3 knobs controlling effect parameters with automatic loading
- **Jog Wheel**: Touch-sensitive with LED position indicator

### Center Section
- **Master Volume**: Main output control
- **Trax Navigation**: Track/playlist browsing
- **Sampler Pads**: 8 dedicated sampler controls
- **FX Mode Indicators**: Visual feedback for effect states

## MIDI Implementation

The controller uses standard MIDI CC messages with the following channel assignments:
- **Channel 1**: Deck 1 controls
- **Channel 2**: Deck 2 controls  
- **Channel 3**: Deck 3 controls (shift mode)
- **Channel 4**: Deck 4 controls (shift mode)

### FX Knob MIDI Mapping
- **Left Side**: CC 0x01-0x03 (normal), CC 0x01-0x03 (shift)
- **Right Side**: CC 0x41-0x43 (normal), CC 0x41-0x43 (shift)
- **Automatic Effect Loading**: Empty slots automatically load default effects
- **Smart State Management**: Effect states are tracked and synchronized

## Advanced Features

### Effect State Management
The controller maintains comprehensive state tracking:
- Per-deck effect states and assignments
- Automatic deck audio management based on effect states
- State synchronization across FX units
- Runtime configuration switching

### Beat Synchronization
Enhanced beat-synchronized features:
- Channel button flashing synchronized with beat timing
- Proper connection management and cleanup
- Real-time beat state monitoring
- Resource-efficient implementation

### Solo Mode
Robust headphone monitoring system:
- Exclusive solo mode for individual decks
- PFL state preservation and restoration
- Support for switching between soloed decks
- Proper cleanup and state management

## Troubleshooting

### Common Issues
1. **FX Knobs Not Responding**: Check that the controller is properly initialized
2. **LEDs Not Flashing**: Verify beat connections are properly established
3. **Shift Key Not Working**: Ensure MIDI status byte 0xB2 is being received
4. **Effects Not Loading**: Check that FX units are properly configured

### Debug Mode
Enable console logging by checking the browser console in Mixxx's developer tools. The script provides extensive logging for troubleshooting.

### Configuration Validation
Use the built-in configuration functions to verify settings:
```javascript
ReloopBeatmix24.getFxBussMode();           // Get current FX mode (2 or 4)
ReloopBeatmix24.getAllFxCombinations();    // Get all possible FX combinations
ReloopBeatmix24.debugEffectStates();       // Debug effect states
ReloopBeatmix24.debugFxAssignments();      // Debug FX assignments
```

## Version History

- **v2.1.0** (2024-12-19): Advanced FX buss assignment system, enhanced state management
- **v2.0.0** (2024-08-25): Major rewrite for Mixxx 2.4 compatibility
- **v1.3.1** (2016-08-19): Bug fixes and improvements
- **v1.3.0** (2016-08-17): Controller status synchronization
- **v1.2.1** (2016-08-15): Typo fixes and bug corrections
- **v1.2.0** (2016-08-13): Improved jog wheel LED handling
- **v1.1.0** (2016-07-31): Enhanced pad mapping and bug fixes
- **v1.0.0** (2016-07-28): Initial release for Mixxx 2.1.0

## Credits

- **Original Author**: Sébastien Blaisot <sebastien@blaisot.org>
- **Customizations**: milkii
- **Testing & Review**: Be.Ing

## License

This project is licensed under the GNU General Public License v2. See the LICENSE file for details.

## Support

- **Mixxx Forum**: https://mixxx.discourse.group/t/reloop-beatmix-2-4-mapping/16049
- **GitHub Issues**: Report bugs and feature requests through the project repository
- **Wiki Documentation**: https://github.com/mixxxdj/mixxx/wiki/reloop-beatmix-2

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.
