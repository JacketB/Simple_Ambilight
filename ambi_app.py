import serial
import serial.tools.list_ports
import pyautogui
import numpy as np
import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
from pystray import Icon, Menu, MenuItem
from PIL import Image, ImageDraw

# Функция для получения среднего цвета сегмента
def get_average_color(image, left, top, right, bottom):
    segment = image.crop((left, top, right, bottom))
    segment_np = np.array(segment)
    avg_color = np.mean(segment_np, axis=(0, 1))
    return tuple(map(int, avg_color))

# Функция для расчета яркости цвета
def calculate_brightness(color):
    r, g, b = color
    # Яркость по формуле
    brightness = 0.299 * r + 0.587 * g + 0.114 * b
    return brightness

# Функция для масштабирования цвета в зависимости от яркости
def adjust_brightness(color, brightness_factor):
    r, g, b = color
    # Масштабируем каждый канал цвета в соответствии с яркостью
    r = int(r * brightness_factor)
    g = int(g * brightness_factor)
    b = int(b * brightness_factor)
    # Ограничиваем значения до 255
    return (min(r, 255), min(g, 255), min(b, 255))

# Функция обработки скриншота
def process_screenshot(screen_width, screen_height, num_cols, num_rows):
    screenshot = pyautogui.screenshot()
    screenshot = screenshot.resize((screen_width, screen_height))
    segment_width = screen_width // num_cols
    segment_height = screen_height // num_rows
    colors = []

    for row in range(num_rows):
        for col in range(num_cols):
            left = col * segment_width
            top = row * segment_height
            right = left + segment_width
            bottom = top + segment_height
            avg_color = get_average_color(screenshot, left, top, right, bottom)
            colors.append(avg_color)

    return colors

# Функция для отправки цветов на Arduino
def send_colors_to_arduino(arduino, colors):
    data = bytearray()
    for color in colors:
        r, g, b = color
        data.extend([r, g, b])
    
    # Логирование данных, отправляемых на Arduino
    print(f"[LOG] Sending data to Arduino: {data}")
    arduino.write(data)

# Фоновая работа с Arduino
def run_in_background(screen_width, screen_height, num_cols, num_rows, arduino):
    while True:
        colors = process_screenshot(screen_width, screen_height, num_cols, num_rows)

        # Получаем цвета только для крайних сегментов
        top = colors[:num_cols]
        bottom = colors[num_cols * (num_rows - 1):num_cols * num_rows]
        left = [colors[i * num_cols] for i in range(1, num_rows - 1)]
        right = [colors[i * num_cols + num_cols - 1] for i in range(1, num_rows - 1)]

        all_segments = top + right + bottom[::-1] + left[::-1]  # Объединяем в нужном порядке

        # Логирование цветов сегментов
        print(f"[LOG] Colors for segments: {all_segments}")

        # Регулировка яркости каждого цвета
        adjusted_colors = []
        for color in all_segments:
            brightness = calculate_brightness(color)
            brightness_factor = brightness / 255.0  # Нормализуем яркость
            adjusted_color = adjust_brightness(color, brightness_factor)
            adjusted_colors.append(adjusted_color)

        # Логирование отрегулированных цветов
        print(f"[LOG] Adjusted colors: {adjusted_colors}")

        send_colors_to_arduino(arduino, adjusted_colors)
        time.sleep(0.1)  # Обновление каждые 100 мс

# Окно для выбора параметров
def open_settings_window():
    def connect_and_start():
        screen_width = int(width_entry.get())
        screen_height = int(height_entry.get())
        num_cols = int(cols_entry.get())
        num_rows = int(rows_entry.get())
        selected_port = port_combobox.get()

        try:
            arduino = serial.Serial(selected_port, 9600, timeout=1)
            time.sleep(2)  # Ожидание подключения к Arduino
            messagebox.showinfo("Success", "Connection to Arduino established!")
            
            # Скрываем окно настроек
            settings_window.withdraw()
            
            # Запускаем фоновую работу в отдельном потоке
            threading.Thread(
                target=run_in_background, 
                args=(screen_width, screen_height, num_cols, num_rows, arduino), 
                daemon=True
            ).start()
        except serial.SerialException:
            messagebox.showerror("Error", "Unable to connect to Arduino. Check the port and try again.")

    settings_window = tk.Tk()
    settings_window.title("Ambilight settings")

    # Поля для ввода разрешения экрана
    ttk.Label(settings_window, text="Screen width:").grid(row=0, column=0, padx=5, pady=5)
    width_entry = ttk.Entry(settings_window)
    width_entry.insert(0, "1920")
    width_entry.grid(row=0, column=1, padx=5, pady=5)

    ttk.Label(settings_window, text="Screen height:").grid(row=1, column=0, padx=5, pady=5)
    height_entry = ttk.Entry(settings_window)
    height_entry.insert(0, "1080")
    height_entry.grid(row=1, column=1, padx=5, pady=5)

    # Поля для ввода количества сегментов
    ttk.Label(settings_window, text="LEDs by width:").grid(row=2, column=0, padx=5, pady=5)
    cols_entry = ttk.Entry(settings_window)
    cols_entry.insert(0, "60")
    cols_entry.grid(row=2, column=1, padx=5, pady=5)

    ttk.Label(settings_window, text="LEDs by height:").grid(row=3, column=0, padx=5, pady=5)
    rows_entry = ttk.Entry(settings_window)
    rows_entry.insert(0, "30")
    rows_entry.grid(row=3, column=1, padx=5, pady=5)

    # Выбор порта для подключения Arduino
    ttk.Label(settings_window, text="Arduino port:").grid(row=4, column=0, padx=5, pady=5)
    port_combobox = ttk.Combobox(settings_window, values=[port.device for port in serial.tools.list_ports.comports()])
    port_combobox.grid(row=4, column=1, padx=5, pady=5)

    # Кнопка для запуска
    ok_button = ttk.Button(settings_window, text="Connect and GO!", command=connect_and_start)
    ok_button.grid(row=5, column=0, columnspan=2, pady=10)

    settings_window.mainloop()

# Создание иконки для трея
def create_tray_icon():
    def on_quit(icon, item):
        print("[LOG] Exiting application.")
        icon.stop()
        exit(0)

    # Рисуем иконку
    icon_image = Image.new('RGB', (64, 64), color=(255, 255, 255))
    draw = ImageDraw.Draw(icon_image)
    draw.rectangle((0, 0, 63, 63), fill=(0, 122, 204))

    # Меню трея
    menu = Menu(MenuItem('Exit', on_quit))
    icon = Icon("Ambilight", icon_image, "Ambilight", menu)
    icon.run()

# Запуск окна настроек в отдельном потоке
threading.Thread(target=open_settings_window, daemon=True).start()

# Запуск иконки трея
create_tray_icon()
