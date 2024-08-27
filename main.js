import circle from "./circle.js";
import { balls,map,matrix, sharedState } from './state.js'; // Importieren des sharedState aus state.js
import { animation,draw_all_lines, getColor } from './animationHandler.js';
// HTML-Canvas-Element mit der ID 'webgl-canvas' holen
const canvas = document.getElementById('webgl-canvas');

// Canvas-Breite und -Höhe auf die Fensterbreite und -höhe setzen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// WebGL-Kontext vom Canvas-Element abrufen
const gl = canvas.getContext('webgl');

// Viewport auf die gesamte Canvas-Größe setzen
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

// Radius der Kugeln definieren
const radius = 5;
// Anzahl der Kugeln festlegen
const numBalls = 200;
// Leeres Array für die Kugeln erstellen
const old_balls = [];

// Vertex-Shader-Programm definieren (verarbeitet die Position der Kugeln)
const vertexShaderSource = `
    attribute vec2 a_position;
    uniform vec2 u_translation;
    uniform vec2 u_resolution;
    void main() {
        // Position in Pixeln wird in WebGL-Koordinaten umgewandelt
        vec2 translatedPosition = a_position + u_translation;
        vec2 normalizedPosition = translatedPosition / u_resolution * 2.0 - 1.0;
        gl_Position = vec4(normalizedPosition * vec2(1, -1), 0.0, 1.0); // Y-Achse umkehren für WebGL
    }
`;

// Fragment-Shader-Programm definieren (legt die Farbe der Kugeln fest)
const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
        gl_FragColor = u_color;
    }
`;

// Shader erstellen
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// Funktion zum Erstellen und Kompilieren eines Shaders
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(shader));
    }
    return shader;
}

// WebGL-Programm erstellen
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

// Speicherort für die Position und Translation im Shader-Programm abfragen
const positionLocation = gl.getAttribLocation(program, 'a_position');
const translationLocation = gl.getUniformLocation(program, 'u_translation');
const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
const colorLocation = gl.getUniformLocation(program, 'u_color');

// Kugeln initialisieren
for (let i = 0; i < numBalls; i++) {
    old_balls.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
    });
}

// Kreis-Vertices berechnen
const positions = [];
const numVertices = 30;
for (let i = 0; i < numVertices; i++) {
    const angle = 2 * Math.PI * i / numVertices;
    positions.push(radius * Math.cos(angle), radius * Math.sin(angle));
}

// Puffer erstellen und füllen
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

// Funktion zum Zeichnen der Kugeln
function drawBalls() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    old_balls.forEach(ball => {
        gl.uniform2f(translationLocation, ball.x, ball.y); // Position der Kugel setzen
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height); // Canvas-Größe übergeben
        gl.uniform4f(colorLocation, 0.0, 0.0, 1.0, 1.0); // Farbe der Kugel (Blau) setzen
        gl.drawArrays(gl.TRIANGLE_FAN, 0, numVertices); // Kugel zeichnen
    });
}

// Funktion zum Aktualisieren der Kugelpositionen und Kollisionen
function updateBalls() {
    old_balls.forEach(ball => {
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Kollision mit den Rändern des Canvas behandeln
        if (ball.x < radius || ball.x > canvas.width - radius) ball.vx *= -1;
        if (ball.y < radius || ball.y > canvas.height - radius) ball.vy *= -1;
    });
}

// Animationsschleife starten
function animate() {
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    updateBalls();
    drawBalls();

    requestAnimationFrame(animate);
}

// Animation starten
animate();



async function main() {
    const jsoncontent = await loadJson();
  
    createCircles(jsoncontent);
    createConnections(jsoncontent);
    createConnectivityMatrix();
    
    draw_all_lines(getColor());
    sharedState.all_loaded = true;
    
    old_balls.forEach(ball => {
      ball.change_circle_size();
      ball.draw();
    });
  }

  async function loadJson() {
    try {
      const response = await fetch("./obsidian_with_position.json");
      return await response.json();
    } catch (error) {
      console.error("Fehler beim Laden der JSON-Datei:", error);
    }
  }
  
  function createCircles(jsoncontent) {
    jsoncontent.forEach((element, i) => {
      map.set(element.name, element.id);
      balls.push(
        new circle(
          element.id,
          element.category,
          element.is_boss,
          element.name,
          ctx_width / 2 + ctx_width * 0.45 * Math.sin((i / jsoncontent.length) * 2 * Math.PI),
          ctx_height / 2 + ctx_width * 0.45 * Math.cos((i / jsoncontent.length) * 2 * Math.PI),
          element.x_pos,
          element.y_pos,
          circle_size,
          element.content
        )
      );
    });
  }
  
  function createConnections(jsoncontent) {
    jsoncontent.forEach(element => {
      const children_list = element.children.map(child => balls[map.get(child)]);
      const parent_list = element.parents.map(parent => balls[map.get(parent)]);
  
      balls[element.id].child_links = children_list;
      balls[element.id].parent_links = parent_list;
    });
  }
  
  function createConnectivityMatrix() {
    balls.forEach(ball => {
      matrix.push(ball.get_child_links());
    });
  }