import { Connection } from "./Connection";
import { engine } from "./engine";


const initForm = document.querySelector('form');
const initSection = document.getElementById('init');
const gameSection = document.getElementById('game');

let connection: Connection = null;

initForm.addEventListener('submit', async event => {
    event.preventDefault();
    const { nickname } = Object.fromEntries(new FormData(event.target as HTMLFormElement));

    connection = new Connection(nickname as string);
    await connection.open();
    engine(connection);
    showBoard();

    connection.send('startGame');
});

document.getElementById('disconnect').addEventListener('click', () => {
    connection?.disconnect();
    showInit();
});

document.getElementById('restart').addEventListener('click', () => {
    const choice = confirm('Are you sure?');
    if (choice) {
        connection?.send('newGame');
    }
});

function showBoard() {
    initSection.style.display = 'none';
    gameSection.style.display = 'block';
}

function showInit() {
    initSection.style.display = 'block';
    gameSection.style.display = 'none';
}