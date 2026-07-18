// frontend/src/components/Empleados.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Empleados = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      cotiza_isss: true,
      cotiza_afp: true,
    }
  });
  const [mensaje, setMensaje] = useState('');

  const cotizaISSS = watch('cotiza_isss');
  const cotizaAFP = watch('cotiza_afp');

  const onSubmit = async (data) => {
    try {
      await api.post('/empleados', data);
      setMensaje('Empleado registrado exitosamente');
      toast.success('Empleado registrado');
    } catch (error) {
      setMensaje('Error al registrar empleado');
      toast.error('Error al registrar: ' + error.message);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Registro de Empleados</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label>Nombre</label>
          <input
            {...register('nombre', { required: true })}
            className="border p-2 rounded w-full"
          />
          {errors.nombre && <p className="text-red-500">Campo obligatorio</p>}
        </div>

        <div>
          <label>DUI</label>
          <input
            {...register('dui', { required: true })}
            className="border p-2 rounded w-full"
          />
          {errors.dui && <p className="text-red-500">Campo obligatorio</p>}
        </div>

        <div>
          <label>Salario Base</label>
          <input
            {...register('salario_base', { required: true, min: 0 })}
            type="number"
            step="0.01"
            className="border p-2 rounded w-full"
          />
          {errors.salario_base && <p className="text-red-500">Campo obligatorio y mayor a 0</p>}
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('cotiza_isss')} />
            ¿Cotiza ISSS?
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('cotiza_afp')} />
            ¿Cotiza AFP?
          </label>
        </div>

        {cotizaISSS && (
          <div>
            <label>Número de ISSS</label>
            <input
              {...register('isss_numero', { required: cotizaISSS })}
              className="border p-2 rounded w-full"
            />
            {errors.isss_numero && <p className="text-red-500">Campo obligatorio</p>}
          </div>
        )}

        {cotizaAFP && (
          <div>
            <label>Número de AFP</label>
            <input
              {...register('afp_numero', { required: cotizaAFP })}
              className="border p-2 rounded w-full"
            />
            {errors.afp_numero && <p className="text-red-500">Campo obligatorio</p>}
          </div>
        )}

        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">
          Registrar Empleado
        </button>

        {mensaje && <p className="mt-2">{mensaje}</p>}
      </form>
    </div>
  );
};

export default Empleados;