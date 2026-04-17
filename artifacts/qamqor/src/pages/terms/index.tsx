import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@features/language/model/context";

export default function TermsPage() {
    const [, navigate] = useLocation();
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col">
            <div className="p-4 sm:p-6 bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("auth.back")}
                    </button>
                    <h1 className="flex-1 text-center font-bold text-gray-900 text-lg">Пользовательское соглашение Qamqor</h1>
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 pb-20">
                <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-sm border text-gray-800 space-y-6">
                    <section>
                        <h2 className="text-xl font-bold mb-3">1. Общие положения</h2>
                        <p className="text-sm leading-relaxed text-gray-600">
                            Настоящее пользовательское соглашение регулирует отношения между платформой Qamqor и пользователями (волонтёрами, нуждающимися в помощи, администраторами). Используя сервис, вы соглашаетесь с условиями хранения и обработки ваших персональных данных.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">2. Сбор и использование данных</h2>
                        <p className="text-sm leading-relaxed text-gray-600">
                            Мы собираем следующие данные при регистрации: Имя, Фамилия, Дата рождения, Город, Email, Телефон.
                            Эти данные используются исключительно для:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Верификации личности пользователя</li>
                                <li>Обеспечения связи между волонтёром и заказчиком</li>
                                <li>Внутренней аналитики для улучшения качества платформы</li>
                            </ul>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">3. Права и обязанности сторон</h2>
                        <p className="text-sm leading-relaxed text-gray-600">
                            Пользователь обязуется указывать достоверную информацию и не использовать платформу в незаконных целях. Платформа обязуется обеспечивать безопасность хранения данных и не передавать их третьим лицам без явного согласия пользователя, за исключением случаев, предусмотренных законодательством Республики Казахстан.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">4. Ответственность</h2>
                        <p className="text-sm leading-relaxed text-gray-600">
                            Платформа Qamqor выступает информационным посредником и не несёт ответственности за действия волонтёров или получателей услуг вне рамок технического обеспечения связи.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">5. Изменение соглашения</h2>
                        <p className="text-sm leading-relaxed text-gray-600">
                            Администрация вправе изменять условия данного соглашения. Актуальная версия всегда находится на данной странице.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
