import { waitFor } from '../helpers/async';
import {
  LETTER_DURATION, MAX_SPEECH_BUBBLE_WIDTH,
  SPEECH_BUBBLE_ARROW_HEIGHT, SPEECH_BUBBLE_ARROW_WIDTH,
  SPEECH_BUBBLE_ARROW_X,
  SPEECH_BUBBLE_BORDER_COLOR,
  SPEECH_BUBBLE_BORDER_LINE_WIDTH, SPEECH_BUBBLE_BORDER_RADIUS,
  SPEECH_BUBBLE_CANVAS_HEIGHT,
  SPEECH_BUBBLE_CANVAS_WIDTH,
  SPEECH_BUBBLE_FONT_SIZE, SPEECH_BUBBLE_INSIDE_COLOR,
  SPEECH_BUBBLE_PADDING
} from './config';

export interface SpeechBubbleResult {
  durationMs: number;
}

export class SpeechBubble {
  private _canvas: HTMLCanvasElement;
  private _context: CanvasRenderingContext2D;
  private _lastText: string = '';
  private _lastDrawCancellation: () => void;
  private _bubbleOpen: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;

    this._canvas.width = SPEECH_BUBBLE_CANVAS_WIDTH;
    this._canvas.height = SPEECH_BUBBLE_CANVAS_HEIGHT;
    this._canvas.style.width = SPEECH_BUBBLE_CANVAS_WIDTH + 'px';
    this._canvas.style.height = SPEECH_BUBBLE_CANVAS_HEIGHT + 'px';
    this._context = this._canvas.getContext('2d');
    this._context.translate(.5, .5);
  }

  public openBubble(): void {
    this._bubbleOpen = true;
    this._lastText = '';
  }

  public closeBubble(): void {
    this._bubbleOpen = false;
    this._lastText = '';
  }

  public drawSpeech(text: string, options?: Partial<{ center: boolean; letterByLetter: boolean; append: boolean; }>): SpeechBubbleResult {
    const fullOptions: Required<typeof options> = Object.assign({ center: true, letterByLetter: true, append: false }, options);

    const context = this._canvas.getContext('2d');
    this._lastDrawCancellation?.();
    this._clearBubble();
    context.font = `${SPEECH_BUBBLE_FONT_SIZE}px Arial`;
    context.textAlign = fullOptions.center ? 'center' : 'left';

    let duration;

    if (fullOptions.letterByLetter) {
      this._drawSpeechLetterByLetter(context, this._lastText, text, fullOptions);
      duration = { durationMs: LETTER_DURATION * text.length };
    } else {
      this._drawSpeechInstant(context, this._lastText + text, fullOptions);
      duration = { durationMs: 0 };
    }

    if (this._bubbleOpen) {
      this._lastText += text;
    }

    return duration;
  }

  public clearBubble(): void {
    if (!this._bubbleOpen) {
      this._lastDrawCancellation?.();
      this._clearBubble();
    }
  }

  private _clearBubble() {
    this._context.clearRect(0, 0, SPEECH_BUBBLE_CANVAS_WIDTH, SPEECH_BUBBLE_CANVAS_HEIGHT);
  }

  private _drawSpeechBubble(context: CanvasRenderingContext2D, width: number, height: number, center: boolean) {
    const fixForCenter = true;
    const allowedWidth = Math.max(center && fixForCenter ? width : SPEECH_BUBBLE_CANVAS_WIDTH, SPEECH_BUBBLE_ARROW_WIDTH + SPEECH_BUBBLE_BORDER_RADIUS * 2),
      translateX = center && fixForCenter ? SPEECH_BUBBLE_CANVAS_WIDTH / 2 - allowedWidth / 2 : 0,
      bubbleLine = new Path2D();

    // top from left to right
    bubbleLine.moveTo(translateX + SPEECH_BUBBLE_BORDER_RADIUS, SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT - height);
    bubbleLine.lineTo(translateX + allowedWidth - SPEECH_BUBBLE_BORDER_RADIUS, SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT - height);
    // angle top right
    let cp1 = { x: translateX + allowedWidth - SPEECH_BUBBLE_BORDER_LINE_WIDTH, y: SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT - height };
    let cp2 = { x: translateX + allowedWidth - SPEECH_BUBBLE_BORDER_LINE_WIDTH, y: SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT - height };
    //this._drawControlPoint(context, cp1, cp2);
    bubbleLine.bezierCurveTo(
      cp1.x,
      cp1.y,
      cp2.x,
      cp2.y,
      translateX + allowedWidth - SPEECH_BUBBLE_BORDER_LINE_WIDTH,
      SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT - height + SPEECH_BUBBLE_BORDER_RADIUS
    );
    // right from top to bottom
    bubbleLine.lineTo(translateX + allowedWidth - SPEECH_BUBBLE_BORDER_LINE_WIDTH, SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT - SPEECH_BUBBLE_BORDER_RADIUS);
    // angle bottom right
    cp1 = { x: translateX + allowedWidth - SPEECH_BUBBLE_BORDER_LINE_WIDTH, y: SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT, };
    cp2 = { x: translateX + allowedWidth - SPEECH_BUBBLE_BORDER_LINE_WIDTH, y: SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT, };
    //this._drawControlPoint(context, cp1, cp2);
    bubbleLine.bezierCurveTo(
      cp1.x,
      cp1.y,
      cp2.x,
      cp2.y,
      translateX + allowedWidth - SPEECH_BUBBLE_BORDER_RADIUS,
      SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT
    );
    // bottom from right to arrow
    bubbleLine.lineTo(SPEECH_BUBBLE_ARROW_X + SPEECH_BUBBLE_ARROW_WIDTH, SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT);
    // arrow
    bubbleLine.lineTo(SPEECH_BUBBLE_ARROW_X, SPEECH_BUBBLE_CANVAS_HEIGHT);
    bubbleLine.lineTo(SPEECH_BUBBLE_ARROW_X, SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT);
    bubbleLine.lineTo(translateX + SPEECH_BUBBLE_BORDER_RADIUS, SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT);
    // angle bottom left
    cp1 = { x: translateX, y: SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT, };
    cp2 = { x: translateX, y: SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT, };
    //this._drawControlPoint(context, cp1, cp2);
    bubbleLine.bezierCurveTo(
      cp1.x,
      cp1.y,
      cp2.x,
      cp2.y,
      translateX,
      SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT - SPEECH_BUBBLE_BORDER_RADIUS
    );
    // left from bottom to top
    bubbleLine.lineTo(translateX, SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT - height + SPEECH_BUBBLE_BORDER_RADIUS);
    // angle top left
    cp1 = { x: translateX, y: SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT - height, };
    cp2 = { x: translateX, y: SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT - height, };
    bubbleLine.bezierCurveTo(
      cp1.x,
      cp1.y,
      cp2.x,
      cp2.y,
      translateX + SPEECH_BUBBLE_BORDER_RADIUS,
      SPEECH_BUBBLE_CANVAS_HEIGHT - SPEECH_BUBBLE_ARROW_HEIGHT - height
    );

    bubbleLine.closePath();

    const prevFillStyle = context.fillStyle;
    context.fillStyle = SPEECH_BUBBLE_INSIDE_COLOR;
    context.fill(bubbleLine);
    context.fillStyle = prevFillStyle;
    context.strokeStyle = SPEECH_BUBBLE_BORDER_COLOR;
    context.lineWidth = SPEECH_BUBBLE_BORDER_LINE_WIDTH;
    context.stroke(bubbleLine);
  }

  private _drawSpeechInstant(context: CanvasRenderingContext2D, textToDraw: string, options: { center: boolean }) {
    const paddingX = SPEECH_BUBBLE_PADDING,
      paddingY = SPEECH_BUBBLE_PADDING,
      fontSize = SPEECH_BUBBLE_FONT_SIZE,
      lines = this._chopText(MAX_SPEECH_BUBBLE_WIDTH, context, textToDraw),
      textHeight = lines.length * fontSize;

    let maxLineWidth = 0;
    for (const line of lines) {
      maxLineWidth = Math.max(maxLineWidth, context.measureText(line).width);
    }

    this._drawSpeechBubble(
      context,
      maxLineWidth + paddingX * 2,
      textHeight + paddingY * 2,
      options.center
    );

    let lineIndex = 1;
    for (const line of lines) {
      context.fillText(
        line,
        options.center ? SPEECH_BUBBLE_CANVAS_WIDTH / 2 : paddingX,
        SPEECH_BUBBLE_CANVAS_HEIGHT - textHeight + lineIndex * fontSize - paddingY - SPEECH_BUBBLE_ARROW_HEIGHT
      );
      lineIndex++;
    }
  }

  private _drawSpeechLetterByLetter(context: CanvasRenderingContext2D, initialText: string, text: string, options: { center: boolean }) {
    (async () => {
      let cancelled: boolean = false;
      this._lastDrawCancellation = () => cancelled = true;
      let textToWrite = initialText;
      for (let index = 0; index < text.length && !cancelled; index++) {
        const char = text[index];
        this._clearBubble();
        textToWrite += char;
        this._drawSpeechInstant(context, textToWrite, options);
        await waitFor(LETTER_DURATION);
      }
    })();
  }

  private _chopText(maxWidth: number, context: CanvasRenderingContext2D, text: string): string[] {
    if (context.measureText(text).width < maxWidth) {
      return [text];
    }

    const words = text.split(' '),
      lines = [];

    let currentLine: string = null;

    let i = 0;
    while (i < words.length) {
      const word = words[i];
      const lineForecast: string = currentLine === null ? word : `${currentLine} ${word}`;

      if (context.measureText(lineForecast).width > maxWidth) {
        if (currentLine === null) {
          currentLine = this._ellipseOverflowingText(maxWidth, context, word);
          i++;
        }

        lines.push(currentLine);
        currentLine = null;
      } else {
        currentLine = lineForecast;
        i++;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private _ellipseOverflowingText(maxWidth: number, context: CanvasRenderingContext2D, word: string) {
    while (context.measureText(word + '...').width > maxWidth && word.length) {
      word = word.slice(0, word.length - 1);
    }

    return word + '...';
  }

  private _drawControlPoint(context: CanvasRenderingContext2D, cp1: { x: number, y: number }, cp2: { x: number, y: number }) {
    const prevStyle = context.fillStyle;
    context.beginPath();
    context.arc(cp1.x, cp1.y, 2, 0, 2 * Math.PI);
    context.fillStyle = 'red';
    context.fill();
    context.arc(cp2.x, cp2.y, 2, 0, 2 * Math.PI);
    context.fillStyle = 'green';
    context.fill();
    context.fillStyle = prevStyle;
  }
}