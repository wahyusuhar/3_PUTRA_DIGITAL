'use client';

/**
 * ESC/POS Printer Utility for Web Bluetooth
 * Specifically tailored for 58mm Thermal Printers (MP-58N / RPP02N)
 */

declare global {
  interface Window {
    BluetoothDevice: any;
    BluetoothRemoteGATTCharacteristic: any;
  }
  interface Navigator {
    bluetooth: any;
  }
}

// Minimal types for Web Bluetooth
type BluetoothDevice = any;
type BluetoothRemoteGATTCharacteristic = any;

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export class EscPosEncoder {
  private buffer: number[] = [];

  initialize() {
    this.buffer.push(ESC, 0x40);
    return this;
  }

  alignLeft() {
    this.buffer.push(ESC, 0x61, 0x00);
    return this;
  }

  alignCenter() {
    this.buffer.push(ESC, 0x61, 0x01);
    return this;
  }

  alignRight() {
    this.buffer.push(ESC, 0x61, 0x02);
    return this;
  }

  bold(enabled: boolean) {
    this.buffer.push(ESC, 0x45, enabled ? 0x01 : 0x00);
    return this;
  }

  size(width: number, height: number) {
    // width: 0-7, height: 0-7
    const size = ((width & 0x07) << 4) | (height & 0x07);
    this.buffer.push(GS, 0x21, size);
    return this;
  }

  text(content: string) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    for (const byte of bytes) {
      this.buffer.push(byte);
    }
    return this;
  }

  line(content: string = '') {
    this.text(content);
    this.buffer.push(LF);
    return this;
  }

  newline(count: number = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  dashedLine() {
    this.line('--------------------------------');
    return this;
  }

  cut() {
    this.buffer.push(GS, 0x56, 0x01);
    return this;
  }

  getBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

let connectedDevice: BluetoothDevice | null = null;
let printerCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

export async function connectPrinter() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: ['0000ff00-0000-1000-8000-00805f9b34fb'] },
        { name: 'RPP02N' }
      ],
      optionalServices: ['0000ff00-0000-1000-8000-00805f9b34fb']
    });

    const server = await device.gatt?.connect();
    const service = await server?.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb');
    const characteristic = await service?.getCharacteristic('0000ff02-0000-1000-8000-00805f9b34fb');

    connectedDevice = device;
    printerCharacteristic = characteristic || null;

    device.addEventListener('gattserverdisconnected', () => {
      connectedDevice = null;
      printerCharacteristic = null;
    });

    return true;
  } catch (error) {
    console.error('Bluetooth connection error:', error);
    throw error;
  }
}

export async function printData(data: Uint8Array) {
  if (!printerCharacteristic) {
    throw new Error('Printer not connected');
  }

  // Chunks to avoid MTU limits (standard is 20 bytes for some devices)
  const CHUNK_SIZE = 20;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await printerCharacteristic.writeValue(chunk);
  }
}

export function isPrinterConnected() {
  return connectedDevice && connectedDevice.gatt?.connected;
}
