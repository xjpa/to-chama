const weekContainer = document.getElementById('weekContainer');
const yearHeader = document.getElementById('yearHeader');
let currentWeekOffset = 0;
let currentWeekStartDateString = '';

const emojis = ['🎯', '🔥', '💀'];
const statusClasses = {
  '🎯': 'status-completed',
  '🔥': 'status-inprogress',
  '💀': 'status-procrastinating',
};

function getWeekDates(startOffset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dayDiff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - dayDiff + startOffset * 7
  );
  const weekStartDateString = startOfWeek.toISOString().slice(0, 10);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    week.push({
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      year: date.getFullYear(),
    });
  }
  return { week, weekStartDateString };
}

function renderWeek() {
  const { week, weekStartDateString } = getWeekDates(currentWeekOffset);
  currentWeekStartDateString = weekStartDateString;
  weekContainer.innerHTML = '';
  const weekDiv = document.createElement('div');
  weekDiv.classList.add('week');

  week.forEach(({ day, date, year }, index) => {
    const dayDiv = document.createElement('div');
    dayDiv.classList.add('day');
    dayDiv.innerHTML = `
          <h3>${day}, ${date}</h3>
          <ul class="todo-list" id="todo-${index}"></ul>
          <div class="input-container">
            <span class="emoji-select" id="emoji-select-${index}">🎯</span>
            <input type="text" id="new-todo-${index}" placeholder="Add new todo...">
            <div class="emoji-dropdown" id="emoji-dropdown-${index}">
              ${emojis
                .map((emoji) => `<div class="emoji-option">${emoji}</div>`)
                .join('')}
            </div>
          </div>
        `;
    weekDiv.appendChild(dayDiv);

    dayDiv.addEventListener('dragover', handleDragOver);
    dayDiv.addEventListener('drop', handleDropOnList);
    dayDiv.addEventListener('dragleave', handleDragLeave);
    dayDiv.dataset.dayIndex = index;
  });

  weekContainer.appendChild(weekDiv);

  week.forEach((_, index) => {
    initEmojiSelector(index);
    loadTodos(index);
    attachInputListener(index);
  });

  yearHeader.innerText = week[0].year;
}

function initEmojiSelector(dayIndex) {
  const emojiSelect = document.getElementById(`emoji-select-${dayIndex}`);
  const dropdown = document.getElementById(`emoji-dropdown-${dayIndex}`);

  emojiSelect.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns();
    dropdown.style.display = 'flex';
  });

  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  const options = dropdown.querySelectorAll('.emoji-option');
  options.forEach((option) => {
    option.addEventListener('click', () => {
      emojiSelect.textContent = option.textContent;
      dropdown.style.display = 'none';
    });
  });

  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
  });
}

function closeAllDropdowns() {
  const dropdowns = document.querySelectorAll('.emoji-dropdown');
  dropdowns.forEach((dropdown) => {
    dropdown.style.display = 'none';
  });
}

function saveTodos(dayIndex, todos) {
  const weekKey = `week-${currentWeekStartDateString}`;
  const savedTodos = JSON.parse(localStorage.getItem(weekKey)) || {};
  savedTodos[dayIndex] = todos;
  localStorage.setItem(weekKey, JSON.stringify(savedTodos));
}

function loadTodos(dayIndex) {
  const weekKey = `week-${currentWeekStartDateString}`;
  const savedTodos = JSON.parse(localStorage.getItem(weekKey)) || {};
  const todoList = document.getElementById(`todo-${dayIndex}`);
  todoList.innerHTML = '';

  if (savedTodos[dayIndex] && savedTodos[dayIndex].length > 0) {
    todoList.classList.remove('empty');
    savedTodos[dayIndex].forEach((todoObj, todoIndex) => {
      createTodoElement(todoObj, dayIndex, todoIndex);
    });
  } else {
    todoList.classList.add('empty');
  }
}

function createTodoElement(todoObj, dayIndex, todoIndex) {
  const todoList = document.getElementById(`todo-${dayIndex}`);
  const li = document.createElement('li');
  li.classList.add('todo-item');
  li.setAttribute('contenteditable', 'false');

  li.setAttribute('draggable', 'true');
  li.dataset.dayIndex = dayIndex;
  li.dataset.todoIndex = todoIndex;

  li.addEventListener('dragstart', handleDragStart);
  li.addEventListener('dragover', handleDragOver);
  li.addEventListener('drop', handleDrop);
  li.addEventListener('dragend', handleDragEnd);

  li.classList.remove(...Object.values(statusClasses));
  if (todoObj.emoji && statusClasses[todoObj.emoji]) {
    li.classList.add(statusClasses[todoObj.emoji]);
  }

  const span = document.createElement('span');
  span.classList.add('todo-text');
  span.textContent = todoObj.text;

  const emojiSpan = document.createElement('span');
  emojiSpan.classList.add('emoji-span');
  emojiSpan.textContent = todoObj.emoji || '';

  span.addEventListener('click', () => enableEdit(li, dayIndex, todoIndex));

  emojiSpan.addEventListener('click', (e) => {
    e.stopPropagation();
    showEmojiSelectorForTodo(emojiSpan, li, todoObj, dayIndex, todoIndex);
  });

  li.appendChild(span);
  li.appendChild(emojiSpan);

  todoList.appendChild(li);
}

function attachInputListener(dayIndex) {
  const inputField = document.getElementById(`new-todo-${dayIndex}`);
  const emojiSelect = document.getElementById(`emoji-select-${dayIndex}`);

  inputField.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const todoText = inputField.value.trim();
      const selectedEmoji = emojiSelect.textContent.trim();
      if (todoText) {
        const todoObj = { text: todoText, emoji: selectedEmoji };
        const todos = getTodosFromLocalStorage(dayIndex);

        todos.push(todoObj);
        saveTodos(dayIndex, todos);

        createTodoElement(todoObj, dayIndex, todos.length - 1);
        inputField.value = '';
      }
    }
  });
}

function getTodosFromLocalStorage(dayIndex) {
  const weekKey = `week-${currentWeekStartDateString}`;
  const savedTodos = JSON.parse(localStorage.getItem(weekKey)) || {};
  return savedTodos[dayIndex] || [];
}

function enableEdit(li, dayIndex, todoIndex) {
  const span = li.querySelector('.todo-text');
  span.setAttribute('contenteditable', 'true');
  span.classList.add('editing-todo');
  span.focus();

  function saveEdit(event) {
    if (event.type === 'blur' || event.key === 'Enter') {
      event.preventDefault();
      processTodoEdit(li, dayIndex, todoIndex);
      span.removeEventListener('keypress', saveEdit);
      span.removeEventListener('blur', saveEdit);
    }
  }

  span.addEventListener('keypress', saveEdit);
  span.addEventListener('blur', saveEdit);
}

function processTodoEdit(li, dayIndex, todoIndex) {
  const span = li.querySelector('.todo-text');
  const newTodoText = span.innerText.trim();
  if (newTodoText) {
    span.setAttribute('contenteditable', 'false');
    span.classList.remove('editing-todo');
    updateTodoText(dayIndex, todoIndex, newTodoText);
  } else {
    li.remove();
    deleteTodo(dayIndex, todoIndex);
  }
}

function updateTodoText(dayIndex, todoIndex, newTodoText) {
  const todos = getTodosFromLocalStorage(dayIndex);
  if (todos[todoIndex]) {
    todos[todoIndex].text = newTodoText;
    saveTodos(dayIndex, todos);
  }
}

function deleteTodo(dayIndex, todoIndex) {
  const todos = getTodosFromLocalStorage(dayIndex);
  if (todos[todoIndex]) {
    todos.splice(todoIndex, 1);
    saveTodos(dayIndex, todos);
  }
}

function showEmojiSelectorForTodo(emojiSpan, li, todoObj, dayIndex, todoIndex) {
  const selector = document.createElement('div');
  selector.classList.add('emoji-selector');
  emojis.forEach((emoji) => {
    const button = document.createElement('button');
    button.classList.add('emoji-button');
    button.textContent = emoji;
    button.addEventListener('click', () => {
      todoObj.emoji = emoji;
      updateTodoEmoji(dayIndex, todoIndex, emoji);
      emojiSpan.textContent = emoji;

      li.classList.remove(...Object.values(statusClasses));
      if (statusClasses[emoji]) {
        li.classList.add(statusClasses[emoji]);
      }

      selector.remove();
    });
    selector.appendChild(button);
  });

  const rect = emojiSpan.getBoundingClientRect();
  selector.style.position = 'absolute';
  selector.style.top = `${rect.bottom + window.scrollY}px`;
  selector.style.left = `${rect.left + window.scrollX}px`;
  selector.style.backgroundColor = '#fff';
  selector.style.border = '1px solid #ccc';
  selector.style.padding = '5px';
  selector.style.borderRadius = '5px';
  selector.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
  document.body.appendChild(selector);

  document.addEventListener(
    'click',
    function handler(event) {
      if (!selector.contains(event.target)) {
        selector.remove();
        document.removeEventListener('click', handler);
      }
    },
    { capture: true }
  );
}

function updateTodoEmoji(dayIndex, todoIndex, newEmoji) {
  const todos = getTodosFromLocalStorage(dayIndex);
  if (todos[todoIndex]) {
    todos[todoIndex].emoji = newEmoji;
    saveTodos(dayIndex, todos);
  }
}

function previousWeek() {
  currentWeekOffset--;
  renderWeek();
}

function nextWeek() {
  currentWeekOffset++;
  renderWeek();
}

let touchstartX = 0;
let touchendX = 0;

function handleGesture() {
  if (touchendX < touchstartX) nextWeek();
  if (touchendX > touchstartX) previousWeek();
}

document.addEventListener('touchstart', (event) => {
  touchstartX = event.changedTouches[0].screenX;
});

document.addEventListener('touchend', (event) => {
  touchendX = event.changedTouches[0].screenX;
  handleGesture();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') nextWeek();
  if (event.key === 'ArrowLeft') previousWeek();
});

window.onload = function () {
  renderWeek();
};

let draggedItem = null;

function handleDragStart(event) {
  draggedItem = this;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', null);

  this.classList.add('dragging');
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';

  if (this.classList.contains('day')) {
    this.classList.add('dragover');
  }
  return false;
}

function handleDragLeave(event) {
  if (this.classList.contains('day')) {
    this.classList.remove('dragover');
  }
}

function handleDrop(event) {
  event.stopPropagation();
  event.preventDefault();

  if (draggedItem !== this) {
    if (draggedItem.parentNode) {
      draggedItem.parentNode.removeChild(draggedItem);
    }

    const dropTargetList = this.closest('.todo-list');

    dropTargetList.insertBefore(draggedItem, this);

    const dropDayIndex = dropTargetList.id.split('-')[1];
    draggedItem.dataset.dayIndex = dropDayIndex;

    updateTodosAfterDragAndDrop(dropTargetList.id);
    const originListId = `todo-${draggedItem.dataset.dayIndex}`;
    if (originListId !== dropTargetList.id) {
      updateTodosAfterDragAndDrop(originListId);
    }
  }

  return false;
}

function handleDropOnList(event) {
  event.preventDefault();
  event.stopPropagation();

  if (draggedItem) {
    const dropDayIndex = this.dataset.dayIndex;
    const todoList = this.querySelector('.todo-list');

    if (draggedItem.parentNode) {
      draggedItem.parentNode.removeChild(draggedItem);
    }

    draggedItem.dataset.dayIndex = dropDayIndex;

    todoList.appendChild(draggedItem);

    updateTodosAfterDragAndDrop(`todo-${dropDayIndex}`);
    const originDayIndex = draggedItem.dataset.dayIndex;
    if (originDayIndex !== dropDayIndex) {
      updateTodosAfterDragAndDrop(`todo-${originDayIndex}`);
    }
  }
}

function handleDragEnd(event) {
  this.classList.remove('dragging');
  document.querySelectorAll('.day.dragover').forEach((day) => {
    day.classList.remove('dragover');
  });
  draggedItem = null;
}

function updateTodosAfterDragAndDrop(listId) {
  const [_, dayIndex] = listId.split('-');
  const todoListElement = document.getElementById(listId);
  const todos = [];

  Array.from(todoListElement.children).forEach((li, index) => {
    const todoText = li.querySelector('.todo-text').innerText;
    const emoji = li.querySelector('.emoji-span').innerText;

    li.dataset.dayIndex = dayIndex;
    li.dataset.todoIndex = index;

    todos.push({ text: todoText, emoji: emoji });
  });

  saveTodos(dayIndex, todos);
}
