import "./App.css";
import Game from "./components/Game";
import Header from "./components/Header";

function App() {
  return (
    <>
      <div className="container"></div>
      <div className="container"></div>
      <div className="centre">
        <div className="app">
          <Header />
          <Game />
        </div>
      </div>
    </>
  );
}

export default App;
