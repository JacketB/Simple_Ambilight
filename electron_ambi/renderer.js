const videoElement = document.querySelector('video');
const screenSelector = document.getElementById('screenSelector');

// Массив для хранения источников
let sources = [];

// Получаем текущие значения количества светодиодов
let ledsHorizontal = document.getElementById('ledsHorizontal').value;
let ledsVertical = document.getElementById('ledsVertical').value;

// Функция для обновления списка доступных экранов
async function updateScreenSelector() {
  try {
    sources = await window.electron.getSources(); // Получаем список экранов
    console.log('Доступные источники:', sources);

    // Очистка текущих опций в селекторе
    screenSelector.innerHTML = '';

    // Добавляем опции для каждого экрана
    sources.forEach((source, index) => {
      const option = document.createElement('option');
      option.value = source.id;
      option.textContent = source.name;
      screenSelector.appendChild(option);
    });

    // По умолчанию выбираем первый экран
    if (sources.length > 0) {
      screenSelector.value = sources[0].id;
      selectScreen(sources[0].id); // Захватываем первый экран
    }
  } catch (err) {
    console.error('Ошибка обновления списка экранов:', err);
  }
}

// Функция для захвата экрана по ID
async function selectScreen(sourceId) {
  try {
    const selectedSource = sources.find(source => source.id === sourceId);

    if (!selectedSource) {
      console.error('Экран не найден!');
      return;
    }

    console.log('Выбран источник:', selectedSource.name);

    // Запрашиваем доступ к экрану
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: selectedSource.id, // Идентификатор выбранного экрана
        },
      },
    });

    // Отображаем захваченный экран в элементе video
    videoElement.srcObject = stream;
    videoElement.play();

    // Отключаем отображение основного видео
    videoElement.style.display = 'none';  // Скрываем видеоэлемент

    // Настроим обработчик кадров с видео
    requestAnimationFrame(processFrame);

  } catch (err) {
    console.error('Ошибка захвата экрана:', err);
  }
}

// Функция для захвата всех сегментов экрана (верх, низ, лево, право)
function captureEdgeRegions() {
  const screenWidth = videoElement.videoWidth;  // Ширина экрана
  const screenHeight = videoElement.videoHeight;  // Высота экрана

  // Вычисление размеров сегментов
  const segmentWidth = Math.floor(screenWidth / ledsHorizontal);  // 30 частей по горизонтали
  const segmentHeight = Math.floor(screenHeight / ledsVertical);  // 10 частей по вертикали

  const canvasList = [];

  // Верхняя часть: создаем 30 канвасов
  for (let i = 0; i < ledsHorizontal; i++) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Устанавливаем размеры для каждого канваса
    canvas.width = segmentWidth;
    canvas.height = screenHeight * 0.05;  // Высота верхнего блока 5%

    // Вычисляем координаты сегмента
    const offsetX = i * segmentWidth;
    const offsetY = 0;

    // Захватываем соответствующий сегмент экрана
    ctx.drawImage(videoElement, offsetX, offsetY, segmentWidth, canvas.height, 0, 0, segmentWidth, canvas.height);

    // Добавляем канвас в список
    canvasList.push(canvas);
  }

  // Нижняя часть: создаем 30 канвасов
  for (let i = 0; i < ledsHorizontal; i++) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Устанавливаем размеры для каждого канваса
    canvas.width = segmentWidth;
    canvas.height = screenHeight * 0.05;  // Высота нижнего блока 5%

    // Вычисляем координаты сегмента
    const offsetX = i * segmentWidth;
    const offsetY = screenHeight * 0.95;

    // Захватываем соответствующий сегмент экрана
    ctx.drawImage(videoElement, offsetX, offsetY, segmentWidth, canvas.height, 0, 0, segmentWidth, canvas.height);

    // Добавляем канвас в список
    canvasList.push(canvas);
  }

  // Левая часть: создаем 10 канвасов
  for (let i = 0; i < ledsVertical; i++) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Устанавливаем размеры для каждого канваса
    canvas.width = screenWidth * 0.05;  // Ширина левого блока 5%
    canvas.height = segmentHeight;

    // Вычисляем координаты сегмента
    const offsetX = 0;
    const offsetY = i * segmentHeight;

    // Захватываем соответствующий сегмент экрана
    ctx.drawImage(videoElement, offsetX, offsetY, canvas.width, segmentHeight, 0, 0, canvas.width, segmentHeight);

    // Добавляем канвас в список
    canvasList.push(canvas);
  }

  // Правая часть: создаем 10 канвасов
  for (let i = 0; i < ledsVertical; i++) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Устанавливаем размеры для каждого канваса
    canvas.width = screenWidth * 0.05;  // Ширина правого блока 5%
    canvas.height = segmentHeight;

    // Вычисляем координаты сегмента
    const offsetX = screenWidth * 0.95;
    const offsetY = i * segmentHeight;

    // Захватываем соответствующий сегмент экрана
    ctx.drawImage(videoElement, offsetX, offsetY, canvas.width, segmentHeight, 0, 0, canvas.width, segmentHeight);

    // Добавляем канвас в список
    canvasList.push(canvas);
  }

  return canvasList;
}

// Функция для извлечения среднего цвета из канваса
function getAverageColorFromCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  let r = 0, g = 0, b = 0;
  const totalPixels = pixels.length / 4; // Каждые 4 элемента — это один пиксель (R, G, B, A)

  // Суммируем значения RGB всех пикселей
  for (let i = 0; i < pixels.length; i += 4) {
    r += pixels[i];     // R
    g += pixels[i + 1]; // G
    b += pixels[i + 2]; // B
  }

  // Находим среднее значение для каждого цвета
  r = Math.floor(r / totalPixels);
  g = Math.floor(g / totalPixels);
  b = Math.floor(b / totalPixels);

  return { r, g, b };
}

// Функция для обработки каждого кадра видео
function processFrame() {
  if (!videoElement.videoWidth || !videoElement.videoHeight) {
    requestAnimationFrame(processFrame);
    return;
  }

  // Захватываем все сегменты экрана
  const canvasList = captureEdgeRegions();

  // Массив для хранения средних цветов каждого сегмента
  const averageColors = [];

  // Извлекаем средний цвет из каждого канваса и добавляем его в массив
  canvasList.forEach((canvas, index) => {
    const avgColor = getAverageColorFromCanvas(canvas);
    averageColors.push(avgColor);
    console.log(`Средний цвет сегмента ${index}:`, avgColor);
  });

  // Здесь можно использовать averageColors для дальнейшей обработки

  requestAnimationFrame(processFrame); // Продолжаем обработку следующих кадров
}

// Обработчик изменения выбора экрана в селекторе
screenSelector.addEventListener('change', (event) => {
  const selectedId = event.target.value;
  selectScreen(selectedId); // Захватываем новый экран по выбранному ID
});

// Обработчики изменений в полях для светодиодов
document.getElementById('ledsHorizontal').addEventListener('input', (event) => {
  ledsHorizontal = event.target.value;
  console.log('Горизонтальные светодиоды:', ledsHorizontal);
});

document.getElementById('ledsVertical').addEventListener('input', (event) => {
  ledsVertical = event.target.value;
  console.log('Вертикальные светодиоды:', ledsVertical);
});

const ledsHorizontalInput = document.getElementById('ledsHorizontal');
const ledsVerticalInput = document.getElementById('ledsVertical');
const ledTableContainer = document.getElementById('ledTableContainer');

ledsHorizontalInput.addEventListener('input', createTable);
ledsVerticalInput.addEventListener('input', createTable);

// Функция для создания и окраски таблицы
function createTable() {
  // Очистить контейнер перед созданием новой таблицы
  ledTableContainer.innerHTML = '';

  // Создаем таблицу
  const table = document.createElement('table');

  // Сначала захватываем все канвасы и их средние цвета
  const canvasList = captureEdgeRegions();
  const averageColors = [];

  // Извлекаем средний цвет из каждого канваса
  canvasList.forEach((canvas, index) => {
    const avgColor = getAverageColorFromCanvas(canvas);
    averageColors.push(avgColor);
  });

  // Создаем строки таблицы
  for (let i = 0; i < ledsVertical; i++) {
    const row = document.createElement('tr');

    // Создаем ячейки в строках
    for (let j = 0; j < ledsHorizontal; j++) {
      const cell = document.createElement('td');

      // Окрашиваем ячейки в зависимости от их позиции
      if (i === 0) {
        // Верхняя строка: используем цвета из верхней границы
        cell.style.backgroundColor = `rgb(${averageColors[j].r}, ${averageColors[j].g}, ${averageColors[j].b})`;
      } else if (i === ledsVertical - 1) {
        // Нижняя строка: используем цвета из нижней границы
        cell.style.backgroundColor = `rgb(${averageColors[j + ledsHorizontal].r}, ${averageColors[j + ledsHorizontal].g}, ${averageColors[j + ledsHorizontal].b})`;
      } else if (j === 0) {
        // Левый столбец: используем цвета из левой границы
        cell.style.backgroundColor = `rgb(${averageColors[ledsHorizontal + i].r}, ${averageColors[ledsHorizontal + i].g}, ${averageColors[ledsHorizontal + i].b})`;
      } else if (j === ledsHorizontal - 1) {
        // Правый столбец: используем цвета из правой границы
        cell.style.backgroundColor = `rgb(${averageColors[ledsHorizontal * 2 + i].r}, ${averageColors[ledsHorizontal * 2 + i].g}, ${averageColors[ledsHorizontal * 2 + i].b})`;
      } else {
        // Для остальных ячеек можно выбрать стандартный цвет
        cell.style.backgroundColor = '#ffffff';  // Белый по умолчанию
      }

      row.appendChild(cell);
    }

    table.appendChild(row);
  }

  // Добавляем таблицу в контейнер
  ledTableContainer.appendChild(table);
}


// Инициализация селектора экрана при старте
updateScreenSelector();

createTable();
