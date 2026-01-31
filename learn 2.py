   def _create_flashcards(self) -> List[Dict]:
        """Создаёт карточки для запоминания."""
        print("[ENGINE] Создаю карточки...")

        cards = []

        # Простейшие карточки из персонажей
        if "characters" in self.data:
            for char in self.data["characters"][:15]:  # Ограничим количество
                card = {
                    "id": len(cards),
                    "type": "character",
                    "front": f"Кто такой(ая) {char.get('name', 'этот персонаж')}?",
                    "back": f"{char.get('role', '')}\n\n{char.get('description', '')}",
                    "hint": f"Роль: {char.get('role', '')}",
                    "difficulty": 1,
                }
                cards.append(card)

        # Карточки из событий
        if "events" in self.data:
            for event in self.data["events"][:10]:
                card = {
                    "id": len(cards),
                    "type": "event",
                    "front": f"Что за событие: '{event.get('name', 'это событие')}'?",
                    "back": f"{event.get('description', '')}",
                    "hint": f"Участники: {', '.join(event.get('participants', [])[:2]) if event.get('participants') else 'нет'}",
                    "difficulty": 2,
                }
                cards.append(card)

        self.cards = cards
        return cards

    def _create_test(self) -> Dict:
        """Создаёт тест с контекстно-релевантными дистракторами."""
        print("[ENGINE] Создаю тест с контекстными дистракторами...")

        test = {
            "title": "Проверка знаний",
            "description": "Тест на основе изученного материала",
            "questions": [],
        }

        # Простые вопросы с выбором ответа
        if "characters" in self.data and len(self.data["characters"]) >= 2:
            for i, char in enumerate(self.data["characters"][:5]):  # 5 вопросов
                correct_role = char.get("role", "Неизвестно")

                # Генерируем контекстно-релевантные дистракторы
                distractors = self._generate_contextual_distractors(
                    correct_role=correct_role,
                    character_name=char.get("name", ""),
                    context=self.raw_text,
                )

                # Собираем все варианты (правильный + неправильные)
                all_options = [correct_role] + distractors

                # Перемешиваем варианты
                import random

                random.shuffle(all_options)

                # Находим индекс правильного ответа после перемешивания
                correct_index = all_options.index(correct_role)

                question = {
                    "id": i,
                    "type": "choice",
                    "text": f"Кто такой(ая) {char.get('name')}?",
                    "correct": correct_index,
                    "options": all_options,
                    "points": 1,
                    "explanation": char.get("description", ""),
                }
                test["questions"].append(question)

        # Вопросы верно/неверно
        if "events" in self.data:
            for i, event in enumerate(self.data["events"][:3]):
                question = {
                    "id": 5 + i,
                    "type": "true_false",
                    "text": f"Событие '{event.get('name')}' действительно произошло в этом материале.",
                    "correct": True,
                    "points": 1,
                }
                test["questions"].append(question)

        # Вопросы на соответствие (если достаточно данных)
        if "characters" in self.data and len(self.data["characters"]) >= 3:
            question = {
                "id": len(test["questions"]),
                "type": "matching",
                "text": "Соотнесите персонажей с их описаниями:",
                "pairs": [],
                "points": 2,
            }

            # Берем 3 персонажа для соответствия
            matching_chars = self.data["characters"][:3]
            for char in matching_chars:
                question["pairs"].append(
                    {
                        "character": char.get("name"),
                        "description": char.get("description", "")[:100],
                    }
                )

            test["questions"].append(question)

        self.test_questions = test["questions"]
        return test

    def _export_markdown(self) -> str:
        """Экспортирует в Markdown."""
        print("[ENGINE] Готовлю Markdown...")

        md = f"# Конспект\n\n"
        md += f"*Создано: {datetime.now().strftime('%d.%m.%Y %H:%M')}*\n\n"

        # Персонажи
        if "characters" in self.data and self.data["characters"]:
            md += "## Персонажи\n\n"
            for char in self.data["characters"][:10]:
                md += f"### {char.get('name', 'Без имени')}\n"
                md += f"- **Роль**: {char.get('role', '')}\n"
                md += f"- **Описание**: {char.get('description', '')}\n\n"

        # События
        if "events" in self.data and self.data["events"]:
            md += "## События\n\n"
            for i, event in enumerate(self.data["events"][:10]):
                md += f"### {i+1}. {event.get('name', 'Без названия')}\n"
                md += f"- **Описание**: {event.get('description', '')}\n"
                if event.get("participants"):
                    md += f"- **Участники**: {', '.join(event.get('participants'))}\n"
                md += "\n"

        # Тестовые вопросы (добавляем в экспорт)
        if self.test_questions:
            md += "## Тестовые вопросы\n\n"
            for q in self.test_questions[:5]:
                md += f"### {q['text']}\n"
                if q["type"] == "choice":
                    for j, option in enumerate(q["options"]):
                        prefix = "✓ " if j == q["correct"] else "○ "
                        md += f"- {prefix}{option}\n"
                md += "\n"

        return md

    def _get_stats(self) -> Dict:
        """Возвращает статистику."""
        stats = {
            "total_characters": len(self.data.get("characters", [])),
            "total_events": len(self.data.get("events", [])),
            "total_locations": len(self.data.get("locations", [])),
            "total_flashcards": len(self.cards),
            "total_questions": len(self.test_questions),
            "processing_time": datetime.now().strftime("%H:%M:%S"),
        }
        return stats

    def run_interactive_mode(self):
        """Запускает интерактивный режим в консоли (для тестирования)."""
        print("\n" + "=" * 50)
        print("LEARNGAME AI - ИНТЕРАКТИВНЫЙ РЕЖИМ")
        print("=" * 50)

        materials = self.create_all_materials()

        print(f"\n📊 Статистика:")
        for key, value in materials["stats"].items():
            print(f"  {key}: {value}")

        print(
            f"\n📖 Конспект создан ({len(materials['study_guide']['sections'])} раздела)"
        )
        print(f"🎴 Карточек создано: {len(materials['flashcards'])}")
        print(f"✅ Вопросов в тесте: {len(materials['test']['questions'])}")

        # Показать первый вопрос теста с дистракторами
        if materials["test"]["questions"]:
            print(f"\n✅ ПЕРВЫЙ ВОПРОС ТЕСТА:")
            question = materials["test"]["questions"][0]
            print(f"ВОПРОС: {question['text']}")
            if question["type"] == "choice":
                for i, option in enumerate(question["options"]):
                    mark = "✓" if i == question["correct"] else " "
                    print(f"  [{mark}] {i+1}. {option}")

        print("\n" + "=" * 50)
        print("✅ Все материалы успешно созданы!")
        print("=" * 50)


# Функция для быстрого тестирования
def quick_test():
    """Быстрый тест движка с примером данных."""
    print("🧪 Тестируем LearningEngine с контекстными дистракторами...")

    # Пример данных (как от ИИ)
    example_data = {
        "characters": [
            {
                "name": "Геракл",
                "role": "герой",
                "description": "Сын Зевса, выполнил 12 подвигов",
            },
            {
                "name": "Гера",
                "role": "богиня",
                "description": "Жена Зевса, преследовала Геракла",
            },
            {
                "name": "Зевс",
                "role": "верховный бог",
                "description": "Правитель Олимпа, бог неба и грома",
            },
        ],
        "events": [
            {
                "name": "Убийство немейского льва",
                "description": "Первый подвиг Геракла",
                "participants": ["Геракл", "Немейский лев"],
            }
        ],
        "locations": [{"name": "Немея", "description": "Место, где жил немейский лев"}],
    }

    # Пример текста для контекста
    example_text = """
    Греческая мифология. Геракл - сын Зевса и Алкмены. Гера, жена Зевса, преследовала Геракла.
    Зевс - верховный бог Олимпа. Геракл совершил 12 подвигов, включая убийство немейского льва.
    """

    engine = LearningEngine(example_data, example_text)
    engine.run_interactive_mode()


if __name__ == "__main__":
    # Если запускаем файл напрямую - тестируем
    quick_test()
