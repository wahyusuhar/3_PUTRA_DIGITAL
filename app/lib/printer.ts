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

// Common ESC/POS Service UUIDs for discovery
const COMMON_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Printing Service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Common Thermal (RPP02N)
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile
  '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Microchip / Generic
];

// Common Write Characteristics
const COMMON_WRITE_CHARS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '0000ff02-0000-1000-8000-00805f9b34fb'
];

let connectedDevice: BluetoothDevice | null = null;
let printerCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

export function checkBluetoothSupport() {
  if (typeof navigator === 'undefined') return { supported: false, reason: 'ssr' };
  
  if (!navigator.bluetooth) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';
    
    if (!isHttps && !isLocal) {
      return { supported: false, reason: 'browser_security', message: 'Browser memblokir Bluetooth karena koneksi tidak aman (Bukan HTTPS). Jika di Vercel, pastikan menggunakan alamat https://' };
    }
    
    // Check for common blockers
    if (isHttps || isLocal) {
      return { supported: false, reason: 'not_supported', message: 'Browser/Perangkat Anda tidak mendukung Web Bluetooth. (iPhone/Safari belum didukung, gunakan Chrome di Android/PC).' };
    }
  }
  return { supported: true };
}

export async function connectPrinter() {
  try {
    // Broadening discovery: Search for RPP02N name or common print services
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { name: 'RPP02N' },
        { services: ['0000ff00-0000-1000-8000-00805f9b34fb'] }
      ],
      optionalServices: COMMON_PRINTER_SERVICES
    });

    const server = await device.gatt?.connect();
    
    // Attempt to find any known primary service
    let service: any = null;
    for (const serviceUuid of COMMON_PRINTER_SERVICES) {
      try {
        service = await server?.getPrimaryService(serviceUuid);
        if (service) break;
      } catch (e) {}
    }

    if (!service) {
      // Fallback: try to get any service if literal ones fail
      const services = await server?.getPrimaryServices();
      service = services?.[0];
    }

    // Attempt to find any write characteristic
    let characteristic: any = null;
    if (service) {
      for (const charUuid of COMMON_WRITE_CHARS) {
        try {
          characteristic = await service.getCharacteristic(charUuid);
          if (characteristic) break;
        } catch (e) {}
      }
      
      if (!characteristic) {
        // Fallback: try to find characteristic with "write" properties
        const chars = await service.getCharacteristics();
        characteristic = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
      }
    }

    if (!characteristic) {
       throw new Error('Tidak dapat menemukan fitur cetak pada printer ini.');
    }

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
    throw new Error('Printer tidak terhubung.');
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
