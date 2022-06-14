import { MyReact } from '../myreact/index';
import { App } from './App.jsx';

const container = document.getElementById("root");

/** @jsx MyReact.createElement */
MyReact.render(<App />, container);