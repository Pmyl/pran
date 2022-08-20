import { JSDOM } from 'jsdom';
const { window } = new JSDOM('<!doctype html><html><body></body></html>');

(global as any).document = window.document;
(global as any).window = window;