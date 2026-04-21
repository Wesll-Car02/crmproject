import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Mail, Phone, ChevronLeft, Check, Video } from 'lucide-react';
import { format, addHours, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface TimeSlot {
  time: string;
  label: string;
  available: boolean;
  startTime: string;
  endTime: string;
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title?: string;
  company?: string;
  timezone?: string;
}

interface AvailabilityResponse {
  date: string;
  userSlug: string;
  userName: string;
  timezone: string;
  availableSlots: TimeSlot[];
}

export default function PublicBookingPage() {
  const { userSlug } = useParams<{ userSlug: string }>();
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Buscar informações do usuário e disponibilidade inicial
  useEffect(() => {
    const fetchUserInfoAndAvailability = async () => {
      try {
        // TODO: Implementar endpoint público para informações do usuário
        // Por enquanto, vamos usar dados simulados
        setUserInfo({
          id: userSlug || 'default',
          firstName: 'Consultor',
          lastName: 'Comercial',
          email: 'consultor@empresa.com',
          title: 'Especialista Comercial',
          company: 'Empresa CRM',
          timezone: 'America/Sao_Paulo'
        });

        // Buscar disponibilidade para a data selecionada
        await fetchAvailability(selectedDate);
      } catch (error) {
        toast.error('Usuário não encontrado');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfoAndAvailability();
  }, [userSlug, navigate]);

  // Buscar disponibilidade quando a data muda
  useEffect(() => {
    if (userInfo) {
      fetchAvailability(selectedDate);
    }
  }, [selectedDate, userInfo]);

  // Função para buscar slots disponíveis
  const fetchAvailability = async (date: Date) => {
    if (!userSlug) return;

    setLoadingSlots(true);
    setSelectedTime(''); // Reset selected time when date changes

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await api.get(`/scheduling/public/${userSlug}/availability?date=${dateStr}`);
      const data: AvailabilityResponse = response.data;

      setAvailableSlots(data.availableSlots);

      // Atualizar timezone do usuário se disponível
      if (data.timezone && userInfo) {
        setUserInfo(prev => prev ? { ...prev, timezone: data.timezone } : null);
      }
    } catch (error: any) {
      console.error('Erro ao buscar disponibilidade:', error);
      setAvailableSlots([]);

      if (error.response?.status === 404) {
        toast.error('Consultor não encontrado');
        navigate('/');
      } else {
        toast.error('Erro ao carregar horários disponíveis');
      }
    } finally {
      setLoadingSlots(false);
    }
  };

  // Gerar próximos 7 dias
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfDay(new Date()), i);
    return {
      date,
      label: format(date, 'EEE, d MMM', { locale: ptBR }),
      fullLabel: format(date, "EEEE, d 'de' MMMM", { locale: ptBR }),
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTime) {
      toast.error('Selecione um horário');
      return;
    }

    if (!formData.guestName.trim() || !formData.guestEmail.trim()) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }

    // Encontrar o slot selecionado para obter startTime e endTime
    const selectedSlot = availableSlots.find(slot => slot.time === selectedTime);
    if (!selectedSlot) {
      toast.error('Horário selecionado não é válido');
      return;
    }

    // Verificar disponibilidade uma última vez antes de agendar
    try {
      const checkResponse = await api.post(`/scheduling/public/${userSlug}/check-availability`, {
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime
      });

      if (!checkResponse.data.available) {
        toast.error('Este horário não está mais disponível. Por favor, selecione outro horário.');
        await fetchAvailability(selectedDate); // Atualizar lista de slots
        return;
      }
    } catch (error: any) {
      toast.error('Erro ao verificar disponibilidade do horário');
      return;
    }

    setSubmitting(true);
    try {
      const bookingData = {
        guestName: formData.guestName.trim(),
        guestEmail: formData.guestEmail.trim(),
        guestPhone: formData.guestPhone.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      };

      await api.post(`/scheduling/public/${userSlug}`, bookingData);

      toast.success('Reunião agendada com sucesso! Você receberá um e-mail de confirmação.');

      // Limpar formulário e atualizar disponibilidade
      setFormData({
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        notes: '',
      });
      setSelectedTime('');
      await fetchAvailability(selectedDate); // Atualizar lista de slots após agendamento

    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error(error.response.data.error || 'Este horário não está mais disponível');
        await fetchAvailability(selectedDate); // Atualizar lista de slots
      } else {
        toast.error(error?.response?.data?.error || 'Erro ao agendar reunião');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 to-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 to-dark-950">
      {/* Header */}
      <header className="border-b border-dark-800/50">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
            <span>Voltar</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - User Info */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 border border-white/5 sticky top-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {userInfo.firstName[0]}{userInfo.lastName[0]}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-dark-100">
                    {userInfo.firstName} {userInfo.lastName}
                  </h1>
                  {userInfo.title && (
                    <p className="text-dark-400 text-sm">{userInfo.title}</p>
                  )}
                  {userInfo.company && (
                    <p className="text-dark-500 text-sm">{userInfo.company}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-dark-400">
                  <Video size={18} />
                  <span className="text-sm">Reunião por vídeo</span>
                </div>
                <div className="flex items-center gap-3 text-dark-400">
                  <Clock size={18} />
                  <span className="text-sm">60 minutos</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-dark-700/50">
                <h3 className="text-sm font-semibold text-dark-300 mb-3">Sobre esta reunião</h3>
                <p className="text-sm text-dark-500">
                  Esta é uma reunião de descoberta para entender suas necessidades e como podemos ajudar sua empresa.
                  O link da reunião será enviado por e-mail após a confirmação.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6 border border-white/5">
              <h2 className="text-xl font-bold text-dark-100 mb-2">Agendar Reunião</h2>
              <p className="text-dark-500 mb-6">Selecione uma data e horário disponível</p>

              {/* Date Selection */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-dark-300 mb-3 flex items-center gap-2">
                  <Calendar size={16} /> Selecione a Data
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                  {availableDates.map((dateObj) => (
                    <button
                      key={dateObj.date.toISOString()}
                      onClick={() => setSelectedDate(dateObj.date)}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedDate.toDateString() === dateObj.date.toDateString()
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                          : 'border-dark-700 bg-dark-800/50 text-dark-300 hover:border-dark-600'
                      }`}
                    >
                      <div className="text-sm font-medium">{dateObj.label}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-dark-500 mt-2">
                  {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>

              {/* Time Selection */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-dark-300 mb-3 flex items-center gap-2">
                  <Clock size={16} /> Selecione o Horário
                </h3>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
                    <span className="text-dark-400">Carregando horários disponíveis...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 border border-dark-700 rounded-lg">
                    <Clock size={32} className="mx-auto mb-2 text-dark-600" />
                    <p className="text-dark-500">Nenhum horário disponível para esta data</p>
                    <p className="text-sm text-dark-600 mt-1">Selecione outra data</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        disabled={!slot.available}
                        className={`p-3 rounded-lg border transition-all ${
                          selectedTime === slot.time
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                            : slot.available
                            ? 'border-dark-700 bg-dark-800/50 text-dark-300 hover:border-dark-600'
                            : 'border-dark-800 bg-dark-900/30 text-dark-600 cursor-not-allowed'
                        }`}
                      >
                        <div className="text-sm font-medium">{slot.label}</div>
                        {!slot.available && (
                          <div className="text-xs text-dark-600 mt-1">Indisponível</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {availableSlots.length > 0 && (
                  <p className="text-xs text-dark-500 mt-2">
                    {availableSlots.filter(slot => slot.available).length} horário(s) disponível(is)
                  </p>
                )}
              </div>

              {/* Booking Form */}
              <form onSubmit={handleSubmit}>
                <h3 className="text-sm font-semibold text-dark-300 mb-4">Seus Dados</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-dark-400 font-medium mb-1 block">
                      <User size={12} className="inline mr-1" /> Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={formData.guestName}
                      onChange={(e) => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-dark-400 font-medium mb-1 block">
                      <Mail size={12} className="inline mr-1" /> E-mail *
                    </label>
                    <input
                      type="email"
                      value={formData.guestEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, guestEmail: e.target.value }))}
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-dark-400 font-medium mb-1 block">
                    <Phone size={12} className="inline mr-1" /> Telefone (opcional)
                  </label>
                  <input
                    type="tel"
                    value={formData.guestPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, guestPhone: e.target.value }))}
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="mb-6">
                  <label className="text-xs text-dark-400 font-medium mb-1 block">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px] resize-none"
                    placeholder="Alguma informação adicional que gostaria de compartilhar..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-dark-700/50">
                  <div className="text-sm text-dark-500">
                    <div className="font-medium text-dark-300">Resumo:</div>
                    <div>
                      {selectedDate && selectedTime && (
                        <>
                          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às {selectedTime}
                          {userInfo?.timezone && (
                            <div className="text-xs text-dark-600 mt-1">
                              Fuso horário: {userInfo.timezone}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !selectedTime}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Agendando...
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        Confirmar Agendamento
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-dark-800/30 border border-dark-700/50 rounded-lg">
              <p className="text-sm text-dark-500 text-center">
                Após o agendamento, você receberá um e-mail de confirmação com o link da reunião.
                Em caso de dúvidas, entre em contato: {userInfo.email}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}