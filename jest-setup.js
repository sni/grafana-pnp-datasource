// react-dom 18 (via @grafana/ui) needs TextEncoder in jsdom, which lacks it
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextEncoder, TextDecoder });

// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';
