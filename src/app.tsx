import { Component, PropsWithChildren } from 'react';
import './app.scss';

export default class App extends Component<PropsWithChildren> {
  render() {
    return this.props.children;
  }
}
