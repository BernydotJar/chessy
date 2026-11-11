import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Chess } from 'chess.js';
import {
  parsePlacement, encodePlacement, beginPositionEditor,
  changePositionDraft, validateEditedPosition
} from '../aula-board-editor.mjs';

const start = new Chess().fen();
test('FEN placement decodes and re-encodes all 64 squares', () => {
  const placement = start.split(' ')[0];
  const board = parsePlacement(placement);
  assert.equal(Object.keys(board).length, 32);
  assert.equal(board.e1, 'K');
  assert.equal(board.d8, 'q');
  assert.equal(encodePlacement(board), placement);
});
test('visual editor moves pieces independent of legal turn and maintains validation', () => {
  let editor = beginPositionEditor(start);
  editor = changePositionDraft(editor, {action:'move',from:'a7',square:'a5'});
  assert.equal(parsePlacement(editor.placement).a5,'p');
  assert.equal(parsePlacement(editor.placement).a7,undefined);
  assert.equal(new Chess(validateEditedPosition(editor)).get('a5').type,'p');
});
test('palette places both colors, clears squares and chooses playing side', () => {
  let editor = beginPositionEditor(start);
  editor = changePositionDraft(editor,{action:'place',square:'e4',piece:'Q'});
  editor = changePositionDraft(editor,{action:'remove',square:'d1'});
  editor = changePositionDraft(editor,{action:'turn',turn:'b'});
  const game = new Chess(validateEditedPosition(editor));
  assert.equal(game.turn(),'b');
  assert.equal(game.get('e4').type,'q');
  assert.equal(game.get('d1'),undefined);
});
test('empty board remains editable and requires both kings before play', () => {
  let editor = changePositionDraft(beginPositionEditor(start),{action:'clear'});
  assert.equal(editor.placement,'8/8/8/8/8/8/8/8');
  assert.throws(()=>validateEditedPosition(editor),/king/i);
  editor = changePositionDraft(editor,{action:'place',square:'e1',piece:'K'});
  editor = changePositionDraft(editor,{action:'place',square:'e8',piece:'k'});
  assert.equal(validateEditedPosition(editor),'4k3/8/8/8/8/8/8/4K3 w - - 0 1');
});
test('invalid square, pieces, rank and actions are rejected', () => {
  const editor=beginPositionEditor(start);
  for(const item of [{action:'place',square:'z9',piece:'K'},
    {action:'place',square:'e4',piece:'X'}, {action:'move',from:'h5',square:'e4'},
    {action:'turn',turn:'invalid'}, {action:'castling',castling:'KQz'},
    {action:'unknown',square:'e4'}]){
    assert.throws(()=>changePositionDraft(editor,item));
  }
  for(const bad of ['8/8/8/8/8/8/8','9/8/8/8/8/8/8/8','8/8/8/8/8/8/8/0']){
    assert.throws(()=>parsePlacement(bad));
  }
});
