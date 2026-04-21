import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Layers, Lock, Mail, Loader2, Shield } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
  totpCode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const loginMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/auth/login', data).then(r => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(`Bem-vindo, ${data.user.firstName}!`);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      if (error.response?.data?.require2FA) {
        setRequires2FA(true);
        toast('Digite seu código 2FA', { icon: '🔐' });
      }
    },
  });

  return (
    <div className="min-h-screen bg-dark-950 flex overflow-hidden">
      {/* Left — Branding */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 via-dark-950 to-violet-900/30" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(to right, #6366f1 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-glow">
              <Layers size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-gradient">CRM Pro</span>
          </div>

          {/* Content */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              Gerencie seus clientes com{' '}
              <span className="text-gradient">inteligência</span>
            </h1>
            <p className="text-dark-400 text-lg mb-10">
              Plataforma completa de CRM com WhatsApp, automações, IA e gestão financeira integrados.
            </p>

            {/* Feature list */}
            <div className="space-y-3">
              {[
                'Kanban e gestão de oportunidades',
                'Integração WhatsApp, Instagram e Email',
                'Automações e workflows visuais',
                'IA para scoring e sugestões',
                'Gestão financeira e boletos Bradesco',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary-400" />
                  </div>
                  <span className="text-dark-300 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="flex gap-8">
            {[
              { value: '22+', label: 'Módulos' },
              { value: '100%', label: 'Docker' },
              { value: 'RBAC', label: 'Controle de Acesso' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-primary-400">{stat.value}</p>
                <p className="text-dark-500 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 py-12 lg:px-12 bg-dark-900 border-l border-dark-800/60">
        <div className="max-w-sm mx-auto w-full">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">CRM Pro</span>
          </div>

          <h2 className="text-2xl font-bold text-dark-50 mb-1">Bem-vindo de volta</h2>
          <p className="text-dark-400 text-sm mb-8">
            {requires2FA ? 'Digite seu código de autenticação' : 'Acesse sua conta para continuar'}
          </p>

          <form onSubmit={handleSubmit((d) => loginMutation.mutate(d))} className="space-y-4">
            {!requires2FA ? (
              <>
                {/* Email */}
                <div className="form-group">
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="seu@email.com"
                      className="input pl-10"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="form-group">
                  <label className="label">Senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="input pl-10 pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="label flex items-center gap-2">
                  <Shield size={14} className="text-primary-400" />
                  Código de Autenticação (2FA)
                </label>
                <input
                  {...register('totpCode')}
                  type="text"
                  placeholder="000000"
                  className="input text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  autoFocus
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full btn-lg mt-2"
            >
              {loginMutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Entrando...</>
              ) : requires2FA ? (
                'Verificar'
              ) : (
                'Entrar'
              )}
            </button>

            {requires2FA && (
              <button
                type="button"
                onClick={() => setRequires2FA(false)}
                className="btn-ghost w-full text-sm"
              >
                ← Voltar
              </button>
            )}
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <p className="text-xs text-dark-400 mb-2 font-medium">🧪 Credenciais de demonstração:</p>
            <p className="text-xs text-dark-300">Email: <span className="text-primary-400">admin@crm.local</span></p>
            <p className="text-xs text-dark-300">Senha: <span className="text-primary-400">Admin@123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
