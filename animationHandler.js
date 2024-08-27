import { balls,map,matrix, sharedState } from './state.js'; // Importieren des sharedState aus state.js

// WebGL-Kontext initialisieren
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl');

// Shader-Programme erstellen (wie in vorherigen Beispielen)
const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
        gl_FragColor = u_color;
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

export async function animation() {
    if (!sharedState.all_loaded) return;
  
    if (sharedState.general_hovered || !sharedState.starting_animation_done) clear();
    if (!sharedState.lines_disappear_animation_done && sharedState.animation_color < 215) {
        sharedState.animation_color += 10;
    } else if (sharedState.lines_disappear_animation_done && sharedState.animation_color > 65) {
        sharedState.animation_color -= 10;
    }
  
    draw_all_lines(gl, program, getColor());
  
    let found_out_of_position = false;
    balls.forEach(ball => {
      if (sharedState.animation_color === 215) ball.follow();
      ball.change_circle_gravity();
      ball.change_circle_size();
      ball.draw();
      
      // Text anzeigen
      //ball.show_text();
  
      if (!ball.in_position) found_out_of_position = true;
    });
  
    sharedState.lines_disappear_animation_done = !found_out_of_position;
    sharedState.starting_animation_done = sharedState.animation_color <= 65 && sharedState.lines_disappear_animation_done;
  
    raf = window.requestAnimationFrame(animation);
  }
  
  export function draw_all_lines(gl, program, color) {
    const lines = []; // Array zum Speichern aller Linien

    // Schleife durch alle Bälle und deren verknüpfte Bälle
    balls.forEach((ball, i) => {
        matrix[i].forEach(linkedBall => {
            // Füge die Positionen der Linie in das Array hinzu
            lines.push([ball.x, ball.y, linkedBall.x, linkedBall.y]);
        });
    });

    // Zeichne alle Linien gleichzeitig
    drawLines(gl, program, lines, color);
}

  function drawLines(gl, program, lines, color) {
    // Erstelle ein Array für alle Linienpositionen
    const positions = [];
    
    // Füge die Positionen aller Linien in das Array ein
    lines.forEach(line => {
        const [x1, y1, x2, y2] = line;
        positions.push(x1, y1, x2, y2);
    });

    // Puffer für die gesammelten Positionsdaten erstellen
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Position-Attribut aus dem Shader-Programm abrufen und aktivieren
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Farbe der Linien setzen (z.B. Rot: [1.0, 0.0, 0.0, 1.0])
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);

    // Zeichne alle Linien in einem einzigen Aufruf
    gl.drawArrays(gl.LINES, 0, positions.length / 2);
}
  
export function getColor() {
  const colorValue = sharedState.animation_color / 255; // Normiere den Wert auf den Bereich 0.0 - 1.0
  return [colorValue, colorValue, colorValue, 1.0]; // Gib die Farbe im RGBA-Format zurück
}

  

  function clear() {
    ctx.clearRect(0, 0, ctx_width, ctx_height);
  }