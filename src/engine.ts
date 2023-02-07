import { Connection } from "./Connection";
import { colors, faces, suits } from "./util";


const actionSection = document.getElementById('action');
let boardSection = document.getElementById('board');


export function engine(connection: Connection) {
    let state: any = {};
    let move = null;
    let moves = null;
    let cachedMoves = null;
    let takeSource = null;

    actionSection.innerHTML = '';
    const newBoard = document.createElement('div');
    boardSection.replaceWith(newBoard);
    newBoard.id = 'board;'
    boardSection = newBoard;

    connection.on('state', onState);
    connection.on('moves', onMoves);
    connection.on('moveResult', onResult);
    connection.on('victory', onVictory);

    boardSection.addEventListener('click', onClick);

    function onClick(event: MouseEvent) {
        if (event.target instanceof HTMLElement && event.target.classList.contains('valid')) {
            const card = event.target;
            const action = card.dataset.action;
            const stack = card.parentElement;
            const pileIndex = stack.dataset.index;
            const suit = stack.dataset.suit;
            const type = stack.parentElement.className;

            move = {
                action,
                source: type,
                target: null,
                index: Number(card.dataset.index)
            };

            if (type == 'pile') {
                move.source += pileIndex;
            } else if (type == 'foundation') {
                move.source = suit;
            }

            if (action == 'place') {
                move.target = move.source;
                move.source = takeSource.source;
                move.index = takeSource.index;
            }

            // NOTE: race condition because 'place' action reads the source and this conditional erases it immediately
            if (action == 'take') {
                cachedMoves = moves;
                takeSource = move;
            } else {
                cachedMoves = null;
                takeSource = null;
            }

            connection.send('move', move);
        } else {
            // cancel selected cards, if any
            if (cachedMoves != null) {
                moves = cachedMoves;
                cachedMoves = null;
                mergeMoves();
            }
        }
    }

    function onState(receivedState) {
        console.log('received state', receivedState);

        state = receivedState;
    }

    function onMoves(receivedMoves) {
        moves = receivedMoves;
        console.log('received moves', moves);
        mergeMoves();
    }

    function onResult(data) {
        console.log(move, data);
        if (move != null) {
            if (move.action == 'flip') {
                if (move.source == 'stock') {
                    if (state.stock.cards.length > 0) {
                        state.stock.cards.pop();
                        state.waste.cards.push(data);
                    } else {
                        state.waste.cards.reverse();
                        state.stock.cards.push(...state.waste.cards);
                        state.stock.cards.forEach(c => c.faceUp = false);
                        state.waste.cards.length = 0;
                    }

                    stateToBoard(state);
                } else if (move.source.includes('pile')) {
                    const pileIndex = Number(move.source[4]);
                    state.piles[pileIndex].cards.pop();
                    state.piles[pileIndex].cards.push(data);

                    stateToBoard(state);
                }
            } else if (move.action == 'place' && data == true) {
                let sourceDeck = null;

                if (move.source == 'stock') {
                    sourceDeck = state.waste;
                } else if (move.source.includes('pile')) {
                    const pileIndex = Number(move.source[4]);
                    sourceDeck = state.piles[pileIndex];
                }

                let targetDeck = null;

                if (move.target == 'stock') {
                    targetDeck = state.waste;
                } else if (move.target.includes('pile')) {
                    const pileIndex = Number(move.target[4]);
                    targetDeck = state.piles[pileIndex];
                } else if (Object.keys(state.foundations).includes(move.target)) {
                    targetDeck = state.foundations[move.target];
                }

                console.log(sourceDeck);
                console.log(targetDeck);

                console.log(move.index, sourceDeck.cards.length - move.index);

                const cards = sourceDeck.cards.splice(move.index, sourceDeck.cards.length - move.index);

                console.log(cards);

                targetDeck.cards.push(...cards);

                stateToBoard(state);

            } else {
                // attempted move was invalid, likely desync of the client; request full state
            }
        }
    }

    function onVictory() {
        alert('Victory!');
        connection.send('newGame');
    }

    function mergeMoves() {
        state.stock.moves = moves.stock;
        state.waste.moves = moves.waste;
        Object.values(state.foundations).forEach((f: any) => f.moves = moves.foundations[f.suit]);
        state.piles.forEach((p, i) => p.moves = moves.piles[i]);

        stateToBoard(state);
    }
}

function stateToBoard(state) {
    boardSection.innerHTML = `
    <div>
        <div class="stock">
            ${createStack(state.stock)}
            ${createStack(state.waste)}
        </div>
        <div class="foundation">
            ${Object.values(state.foundations).map(createStack).join('\n')}
        </div>
    </div>
    <div class="pile">
        ${state.piles.map(createStack).join('\n')}
    </div>
    `
}

function createStack(stack, index?) {
    let className = 'stack';
    let cards = stack.cards;
    let moves = stack.moves;
    if ((stack.moves.place || stack.moves.flip) && cards.length == 0) {
        cards = [{
            face: '',
            suit: '',
            faceUp: true
        }];

        if (stack.suit != null) {
            cards[0].suit = stack.suit
        }
    }

    return `<div class="${className}"${stack.suit != null ? ` data-suit="${stack.suit}"` : ''}${index != undefined ? ` data-index="${index}"` : ''}>
        ${cards.map((c, i) => createCard(i, i == cards.length - 1, c, moves.flip, moves.take.includes(i), moves.place)).join('\n')}
    </div>`
}

function createCard(index, top, card, flip, take, place) {
    let action = '';
    if (flip && top) {
        action = 'data-action="flip"';
    } else if (take) {
        action = 'data-action="take"';
    } else if (place && top) {
        action = 'data-action="place"';
    }

    let className = 'card';
    let content = '';

    if ((!card.suit && card.suit !== null) || (!card.face && card.face !== null)) {
        className = 'placeholder'
    }

    if (card.faceUp) {
        className += ' ' + (colors[card.suit] || '');
        content = (suits[card.suit] || '') + (faces[card.face] || '');
    } else {
        className += ' face-down';
    }

    if (top) {
        className += ' top';
    }

    if ((flip && top) || take || (place && top)) {
        className += ' valid';
    }
    if (place && top) {
        className += ' base';
    }

    if (!card.suit && !card.face && top) {
        content = '&#10226;';
    }

    return `<article ${action}data-index="${index}" class="${className}">${content}</article>`;
}
