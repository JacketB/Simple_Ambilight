const videoElement = document.getElementById('videoElement');
const screenSelector = document.getElementById('screenSelector');
const videoSegment = document.getElementById('videoSegment');
const videoSegmentCtx = videoSegment.getContext('2d');

// Инпуты для светодиодов
const ledsHorizontalInput = document.getElementById('ledsHorizontal');
const ledsVerticalInput = document.getElementById('ledsVertical');

let sources = [];

async function updateScreenSelector() {
  try {
    sources = await window.electron.getSources();
    screenSelector.innerHTML = '';

    sources.forEach((source) => {
      const option = document.createElement('option');
      option.value = source.id;
      option.textContent = source.name;
      screenSelector.appendChild(option);
    });

    if (sources.length > 0) {
      screenSelector.value = sources[0].id;
      selectScreen(sources[0].id);
    }
  } catch (err) {
    console.error('Ошибка обновления списка экранов:', err);
  }
}

async function selectScreen(sourceId) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
        },
      },
    });

    videoElement.srcObject = stream;
    videoElement.play();

    videoElement.addEventListener('loadedmetadata', () => {
      captureEdges(videoElement);
    });
  } catch (err) {
    console.error('Ошибка захвата экрана:', err);
  }
}

function ensureCanvasSize(video, canvas) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

function getAverageColor(imageData) {
  let r = 0, g = 0, b = 0;

  for (let i = 0; i < imageData.data.length; i += 4) {
    r += imageData.data[i];     // Красный
    g += imageData.data[i + 1]; // Зеленый
    b += imageData.data[i + 2]; // Синий
  }

  const pixelCount = imageData.data.length / 4;
  return {
    r: Math.floor(r / pixelCount),
    g: Math.floor(g / pixelCount),
    b: Math.floor(b / pixelCount),
  };
}

function captureEdges(video) {
  if (!video.videoWidth || !video.videoHeight) {
    requestAnimationFrame(() => captureEdges(video));
    return;
  }

  ensureCanvasSize(video, videoSegment);

  const ledsHorizontal = parseInt(ledsHorizontalInput.value, 10);
  const ledsVertical = parseInt(ledsVerticalInput.value, 10);

  const segmentWidth = video.videoWidth / ledsHorizontal;
  const segmentHeight = video.videoHeight / ledsVertical;

  videoSegmentCtx.clearRect(0, 0, videoSegment.width, videoSegment.height);
  videoSegmentCtx.drawImage(video, 0, 0, videoSegment.width, videoSegment.height);

  // Размер области края (в пикселях)
  const edgeMargin = 20;

  // Верхний край
  for (let i = 0; i < ledsHorizontal; i++) {
    const x = i * segmentWidth;
    const y = 0;  // Верхний край, y всегда 0
    const imageData = videoSegmentCtx.getImageData(x, y, segmentWidth, edgeMargin);
    const avgColor = getAverageColor(imageData);

    // Рисуем сегмент с цветом
    videoSegmentCtx.fillStyle = `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`;
    videoSegmentCtx.fillRect(x, y, segmentWidth, edgeMargin);

    // Добавляем границу для сегмента
    videoSegmentCtx.strokeStyle = 'white';
    videoSegmentCtx.lineWidth = 1;
    videoSegmentCtx.strokeRect(x, y, segmentWidth, edgeMargin);

    console.log(`Верхний край, сегмент (${i}, 0) средний цвет: RGB(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`);
  }

  // Левый край
  for (let j = 0; j < ledsVertical; j++) {
    const x = 0;  // Левый край, x всегда 0
    const y = j * segmentHeight;
    const imageData = videoSegmentCtx.getImageData(x, y, edgeMargin, segmentHeight);
    const avgColor = getAverageColor(imageData);

    // Рисуем сегмент с цветом
    videoSegmentCtx.fillStyle = `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`;
    videoSegmentCtx.fillRect(x, y, edgeMargin, segmentHeight);

    // Добавляем границу для сегмента
    videoSegmentCtx.strokeStyle = 'white';
    videoSegmentCtx.lineWidth = 1;
    videoSegmentCtx.strokeRect(x, y, edgeMargin, segmentHeight);

    console.log(`Левый край, сегмент (0, ${j}) средний цвет: RGB(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`);
  }

  // Правый край
  for (let j = 0; j < ledsVertical; j++) {
    const x = video.videoWidth - edgeMargin;  // Правый край
    const y = j * segmentHeight;
    const imageData = videoSegmentCtx.getImageData(x, y, edgeMargin, segmentHeight);
    const avgColor = getAverageColor(imageData);

    // Рисуем сегмент с цветом
    videoSegmentCtx.fillStyle = `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`;
    videoSegmentCtx.fillRect(x, y, edgeMargin, segmentHeight);

    // Добавляем границу для сегмента
    videoSegmentCtx.strokeStyle = 'white';
    videoSegmentCtx.lineWidth = 1;
    videoSegmentCtx.strokeRect(x, y, edgeMargin, segmentHeight);

    console.log(`Правый край, сегмент (${ledsHorizontal - 1}, ${j}) средний цвет: RGB(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`);
  }

  // Не захватываем нижний край
  requestAnimationFrame(() => captureEdges(video));
}

// Обработчики для инпутов светодиодов
ledsHorizontalInput.addEventListener('input', () => {
  captureEdges(videoElement);
});

ledsVerticalInput.addEventListener('input', () => {
  captureEdges(videoElement);
});

screenSelector.addEventListener('change', (e) => {
  selectScreen(e.target.value);
});

updateScreenSelector();
