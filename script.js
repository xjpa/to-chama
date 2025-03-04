(() => {
  // =====================================================
  // Constants & Configuration
  // =====================================================
  const monthContainer = document.getElementById('monthContainer');
  const yearHeader = document.getElementById('yearHeader');

  let monthOffset = 0;
  let currentMonthStartDateString = '';

  const DEFAULT_EMOJI = '💀';
  const EMOJIS = ['🎯', '🔥', '💀'];
  const STATUS_CLASSES = {
    '🎯': 'status-completed',
    '🔥': 'status-inprogress',
    '💀': 'status-procrastinating',
  };

  // =====================================================
  // Utility Functions
  // =====================================================
  const formatDate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(date.getDate()).padStart(2, '0')}`;

  const getMonthKey = () => `month-${currentMonthStartDateString}`;

  // =====================================================
  // Calendar Logic
  // =====================================================
  const getMonthDates = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + monthOffset;
    const startOfMonth = new Date(year, month, 1);
    const monthStartDateString = formatDate(startOfMonth);
    const daysInMonth = new Date(
      startOfMonth.getFullYear(),
      startOfMonth.getMonth() + 1,
      0
    ).getDate();

    const monthDays = [];
    for (let i = 0; i < daysInMonth; i++) {
      const date = new Date(
        startOfMonth.getFullYear(),
        startOfMonth.getMonth(),
        i + 1
      );
      monthDays.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        year: date.getFullYear(),
      });
    }

    const monthName = startOfMonth.toLocaleString('en-US', { month: 'long' });
    const monthYear = startOfMonth.getFullYear();
    return { monthDays, monthStartDateString, monthName, monthYear };
  };

  const renderMonth = () => {
    const { monthDays, monthStartDateString, monthName, monthYear } =
      getMonthDates();
    currentMonthStartDateString = monthStartDateString;
    monthContainer.innerHTML = '';

    // Create month grid
    const monthDiv = document.createElement('div');
    monthDiv.classList.add('month');

    monthDays.forEach(({ day, date }, index) => {
      const dayDiv = document.createElement('div');
      dayDiv.classList.add('day');
      dayDiv.dataset.dayIndex = index;
      dayDiv.innerHTML = `
        <h3>${day}, ${date}</h3>
        <ul class="todo-list" id="todo-${index}"></ul>
        <div class="input-container">
          <span class="emoji-select" id="emoji-select-${index}">${DEFAULT_EMOJI}</span>
          <input type="text" id="new-todo-${index}" placeholder="Add new todo...">
          <div class="emoji-dropdown" id="emoji-dropdown-${index}">
            ${EMOJIS.map(
              (emoji) => `<div class="emoji-option">${emoji}</div>`
            ).join('')}
          </div>
        </div>
      `;
      // Attach drag-and-drop listeners for the day container
      dayDiv.addEventListener('dragover', handleDragOver);
      dayDiv.addEventListener('drop', handleDropOnList);
      dayDiv.addEventListener('dragleave', handleDragLeave);
      monthDiv.appendChild(dayDiv);
    });

    monthContainer.appendChild(monthDiv);

    // Initialize per-day functionality (emoji selectors, todos, input listener)
    monthDays.forEach((_, index) => {
      initEmojiSelector(index);
      loadTodos(index);
      attachInputListener(index);
    });

    yearHeader.innerText = `${monthName} ${monthYear}`;
  };

  // =====================================================
  // Emoji Selector Logic
  // =====================================================
  const initEmojiSelector = (dayIndex) => {
    const emojiSelect = document.getElementById(`emoji-select-${dayIndex}`);
    const dropdown = document.getElementById(`emoji-dropdown-${dayIndex}`);

    emojiSelect.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      dropdown.style.display = 'flex';
    });

    dropdown.addEventListener('click', (e) => e.stopPropagation());

    dropdown.querySelectorAll('.emoji-option').forEach((option) => {
      option.addEventListener('click', () => {
        emojiSelect.textContent = option.textContent;
        dropdown.style.display = 'none';
      });
    });

    document.addEventListener('click', () => (dropdown.style.display = 'none'));
  };

  const closeAllDropdowns = () => {
    document.querySelectorAll('.emoji-dropdown').forEach((dropdown) => {
      dropdown.style.display = 'none';
    });
  };

  // =====================================================
  // Local Storage Helpers & Todo Persistence
  // =====================================================
  const saveTodos = (dayIndex, todos) => {
    const monthKey = getMonthKey();
    const savedTodos = JSON.parse(localStorage.getItem(monthKey)) || {};
    savedTodos[dayIndex] = todos;
    localStorage.setItem(monthKey, JSON.stringify(savedTodos));
  };

  const getTodosFromLocalStorage = (dayIndex) => {
    const monthKey = getMonthKey();
    const savedTodos = JSON.parse(localStorage.getItem(monthKey)) || {};
    return savedTodos[dayIndex] || [];
  };

  const loadTodos = (dayIndex) => {
    const monthKey = getMonthKey();
    const savedTodos = JSON.parse(localStorage.getItem(monthKey)) || {};
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
  };

  // =====================================================
  // Todo Management
  // =====================================================
  const createTodoElement = (todoObj, dayIndex, todoIndex) => {
    const todoList = document.getElementById(`todo-${dayIndex}`);
    const li = document.createElement('li');
    li.classList.add('todo-item');
    li.setAttribute('contenteditable', 'false');
    li.setAttribute('draggable', 'true');
    li.dataset.dayIndex = dayIndex;
    li.dataset.todoIndex = todoIndex;

    // Attach drag-and-drop events
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);

    // Set status class based on emoji
    li.classList.remove(...Object.values(STATUS_CLASSES));
    if (todoObj.emoji && STATUS_CLASSES[todoObj.emoji]) {
      li.classList.add(STATUS_CLASSES[todoObj.emoji]);
    }

    const textSpan = document.createElement('span');
    textSpan.classList.add('todo-text');
    textSpan.textContent = todoObj.text;
    textSpan.addEventListener('click', () =>
      enableEdit(li, dayIndex, todoIndex)
    );

    const emojiSpan = document.createElement('span');
    emojiSpan.classList.add('emoji-span');
    emojiSpan.textContent = todoObj.emoji || '';
    emojiSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      showEmojiSelectorForTodo(emojiSpan, li, todoObj, dayIndex, todoIndex);
    });

    li.append(textSpan, emojiSpan);
    todoList.appendChild(li);
  };

  const attachInputListener = (dayIndex) => {
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
  };

  const enableEdit = (li, dayIndex, todoIndex) => {
    const textSpan = li.querySelector('.todo-text');
    textSpan.setAttribute('contenteditable', 'true');
    textSpan.classList.add('editing-todo');
    textSpan.focus();

    const saveEdit = (event) => {
      if (event.type === 'blur' || event.key === 'Enter') {
        event.preventDefault();
        processTodoEdit(li, dayIndex, todoIndex);
        textSpan.removeEventListener('keypress', saveEdit);
        textSpan.removeEventListener('blur', saveEdit);
      }
    };

    textSpan.addEventListener('keypress', saveEdit);
    textSpan.addEventListener('blur', saveEdit);
  };

  const processTodoEdit = (li, dayIndex, todoIndex) => {
    const textSpan = li.querySelector('.todo-text');
    const newTodoText = textSpan.innerText.trim();
    if (newTodoText) {
      textSpan.setAttribute('contenteditable', 'false');
      textSpan.classList.remove('editing-todo');
      updateTodoText(dayIndex, todoIndex, newTodoText);
    } else {
      li.remove();
      deleteTodo(dayIndex, todoIndex);
    }
  };

  const updateTodoText = (dayIndex, todoIndex, newTodoText) => {
    const todos = getTodosFromLocalStorage(dayIndex);
    if (todos[todoIndex]) {
      todos[todoIndex].text = newTodoText;
      saveTodos(dayIndex, todos);
    }
  };

  const deleteTodo = (dayIndex, todoIndex) => {
    const todos = getTodosFromLocalStorage(dayIndex);
    if (todos[todoIndex]) {
      todos.splice(todoIndex, 1);
      saveTodos(dayIndex, todos);
    }
  };

  const showEmojiSelectorForTodo = (
    emojiSpan,
    li,
    todoObj,
    dayIndex,
    todoIndex
  ) => {
    const selector = document.createElement('div');
    selector.classList.add('emoji-selector');
    EMOJIS.forEach((emoji) => {
      const button = document.createElement('button');
      button.classList.add('emoji-button');
      button.textContent = emoji;
      button.addEventListener('click', () => {
        todoObj.emoji = emoji;
        updateTodoEmoji(dayIndex, todoIndex, emoji);
        emojiSpan.textContent = emoji;

        li.classList.remove(...Object.values(STATUS_CLASSES));
        if (STATUS_CLASSES[emoji]) {
          li.classList.add(STATUS_CLASSES[emoji]);
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
  };

  const updateTodoEmoji = (dayIndex, todoIndex, newEmoji) => {
    const todos = getTodosFromLocalStorage(dayIndex);
    if (todos[todoIndex]) {
      todos[todoIndex].emoji = newEmoji;
      saveTodos(dayIndex, todos);
    }
  };

  // =====================================================
  // Month Navigation
  // =====================================================
  const previousMonth = () => {
    monthOffset--;
    renderMonth();
  };

  const nextMonth = () => {
    monthOffset++;
    renderMonth();
  };

  // =====================================================
  // Drag & Drop Handlers
  // =====================================================
  let draggedItem = null;

  const handleDragStart = function (event) {
    draggedItem = this;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', null);
    this.classList.add('dragging');
  };

  const handleDragOver = function (event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (this.classList.contains('day')) {
      this.classList.add('dragover');
    }
    return false;
  };

  const handleDragLeave = function (event) {
    if (this.classList.contains('day')) {
      this.classList.remove('dragover');
    }
  };

  const handleDrop = function (event) {
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
  };

  const handleDropOnList = function (event) {
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
  };

  const handleDragEnd = function (event) {
    this.classList.remove('dragging');
    document
      .querySelectorAll('.day.dragover')
      .forEach((day) => day.classList.remove('dragover'));
    draggedItem = null;
  };

  const updateTodosAfterDragAndDrop = (listId) => {
    const [, dayIndex] = listId.split('-');
    const todoListElement = document.getElementById(listId);
    const todos = [];
    Array.from(todoListElement.children).forEach((li, index) => {
      const todoText = li.querySelector('.todo-text').innerText;
      const emoji = li.querySelector('.emoji-span').innerText;
      li.dataset.dayIndex = dayIndex;
      li.dataset.todoIndex = index;
      todos.push({ text: todoText, emoji });
    });
    saveTodos(dayIndex, todos);
  };

  // =====================================================
  // Touch Gesture for Month Navigation
  // =====================================================
  let touchstartX = 0;
  let touchendX = 0;

  const handleGesture = () => {
    if (touchendX < touchstartX) nextMonth();
    if (touchendX > touchstartX) previousMonth();
  };

  document.addEventListener('touchstart', (event) => {
    touchstartX = event.changedTouches[0].screenX;
  });

  document.addEventListener('touchend', (event) => {
    touchendX = event.changedTouches[0].screenX;
    handleGesture();
  });

  // Arrow key navigation removed on purpose:
  /*
  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') nextMonth();
    if (event.key === 'ArrowLeft') previousMonth();
  });
  */

  // =====================================================
  // Initialization
  // =====================================================
  window.onload = () => renderMonth();
})();
