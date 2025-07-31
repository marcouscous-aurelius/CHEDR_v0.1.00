# CHEDR_v0.1 - Interactive 3D Cube Site

A dynamic, interactive 3D web experience built with Three.js featuring a responsive cube structure with advanced lighting effects and customizable controls.

## 🎯 Features

### Core Functionality
- **Interactive 3D Cube Structure**: 6x6x6 grid of animated cubes
- **Cursor-Based Interaction**: Cubes respond to mouse/touch movement with smooth animations
- **Inner Cube System**: Toggleable inner layers with non-interactive bottom cubes
- **Lightning Effects**: Dynamic lighting that responds to cube movements

### Advanced Controls
- **Toolbox Interface**: Comprehensive control panel with collapsible sections
- **Display Controls**: Toggle inner cubes, floor visibility, cube color, and opacity
- **Interaction Controls**: Active/passive orbit controls, influence radius, custom falloff curves
- **Environment Controls**: Fog settings, background color, fog color
- **Lightning Controls**: Toggle, strength, color, and fade speed

### Technical Features
- **Responsive Design**: Works on desktop and mobile devices
- **Stable Viewport**: Prevents mobile browser UI jitter
- **Settings Persistence**: Saves user preferences to localStorage
- **Spline Falloff**: Customizable influence curves for cube interactions
- **Touch Support**: Full touch interaction for mobile devices

## 🚀 Getting Started

### Prerequisites
- Modern web browser with WebGL support
- Local web server (for development)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/CHEDR_v0.1.git
   cd CHEDR_v0.1
   ```

2. Start a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. Open your browser and navigate to `http://localhost:8000`

## 🎮 How to Use

### Basic Interaction
- **Move your cursor** over the 3D scene to see cubes respond
- **Click and drag** to rotate the camera (when orbit controls are enabled)
- **Use the toolbox** to customize the experience

### Toolbox Controls

#### Display Section
- **Inner Cubes**: Toggle visibility of inner cube layers
- **Floor**: Show/hide the floor plane and grid
- **Cube Color**: Change the color of all cubes
- **Opacity**: Adjust cube transparency

#### Interaction Section
- **Active Orbit**: Enable click-and-drag camera rotation
- **Passive Orbit**: Enable subtle camera movement based on cursor position
- **Influence**: Adjust how far the cursor affects cubes
- **Falloff Curve**: Customize the influence falloff pattern

#### Environment Section
- **Fog**: Toggle atmospheric fog effect
- **Fog Near/Far**: Adjust fog distance
- **Fog Color**: Change fog color
- **Background Color**: Set scene background

#### Lightning Effects Section
- **Lightning**: Toggle dynamic lighting effects
- **Strength**: Adjust lightning intensity
- **Lightning Color**: Set lightning color
- **Fade Speed**: Control how quickly lightning fades

### Settings Management
- **SET**: Save current settings to browser storage
- **RESET**: Restore default settings

## 🛠️ Technical Details

### Architecture
- **Three.js**: 3D graphics and rendering
- **Vanilla JavaScript**: Core functionality and interactions
- **CSS3**: Styling and animations
- **HTML5**: Structure and controls

### Key Components
- **Cube System**: 216 cubes (6³) with individual animation states
- **Lightning Engine**: Real-time lighting effects based on cube movements
- **Control System**: Modular toolbox with persistent settings
- **Viewport Management**: Stable rendering across devices

### Performance Optimizations
- Efficient raycasting for interactions
- Optimized lighting calculations
- Responsive design with stable viewport
- Minimal console logging in production

## 📱 Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🎨 Customization

### Adding New Controls
1. Add HTML elements to the toolbox
2. Create JavaScript event listeners
3. Integrate with settings system
4. Update save/load functions

### Modifying Cube Behavior
- Edit `ANIMATION_CONFIG` for movement parameters
- Modify `updateLightningEffects()` for lighting changes
- Adjust `isInnerCube()` for cube classification

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or issues, please open an issue on GitHub or contact the development team.

---

**CHEDR_v0.1** - Interactive 3D Cube Experience 