#include <FastLED.h>

#define NUM_LEDS 120  // Количество светодиодов
#define DATA_PIN 6    // Пин подключения ленты

CRGB leds[NUM_LEDS];

void setup() {
  Serial.begin(115200);  // Устанавливаем скорость передачи данных
  FastLED.addLeds<WS2812, DATA_PIN, GRB>(leds, NUM_LEDS);
}

void loop() {
  if (Serial.available() >= NUM_LEDS * 3) {
    // Читаем данные из последовательного порта
    for (int i = 0; i < NUM_LEDS; i++) {
      leds[i].r = Serial.read();  // Красный
      leds[i].g = Serial.read();  // Зеленый
      leds[i].b = Serial.read();  // Синий
    }
    FastLED.show();  // Обновляем ленту
  }
}
