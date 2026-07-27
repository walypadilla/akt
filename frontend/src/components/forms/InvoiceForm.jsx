// frontend/src/components/forms/InvoiceForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getClients } from '../../api/clients';
import { getProductos } from '../../api/productos';
import { createInvoice, updateInvoice, getInvoice } from '../../api/invoices';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ConfirmModal from '../common/ConfirmModal';
import { toast } from 'react-toastify';

const InvoiceForm = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const isEditing = !!id;

	const [formData, setFormData] = useState({
		cliente_id: '',
		tipo_documento: 'FAF',
		descuento: 0,
		intereses_mora: 0,
		estado: 'Emitida', // Emitida, Pagada, Borrador
		usuario_id: 1, // Se llenará con el usuario actual
	});

	const [detalles, setDetalles] = useState([
		{ producto_id: '', cantidad: 1, precio_unitario: 0, subtotal: 0, iva: 0 },
	]);
	const [clientes, setClientes] = useState([]);
	const [productos, setProductos] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState({});
	const [confirmModal, setConfirmModal] = useState({
		isOpen: false,
		title: '',
		message: '',
		onConfirm: null,
	});

	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			try {
				const [clientsData, productsData] = await Promise.all([
					getClients(),
					getProductos(),
				]);
				setClientes(clientsData);
				setProductos(productsData);

				if (isEditing) {
					const invoiceData = await getInvoice(id);
					setFormData({
						cliente_id: invoiceData.cliente_id,
						tipo_documento: invoiceData.tipo_documento || 'FAF',
						descuento: invoiceData.descuento || 0,
						intereses_mora: invoiceData.intereses_mora || 0,
						estado: invoiceData.estado || 'Emitida',
						usuario_id: invoiceData.usuario_id,
					});
					// Cargar detalles (asumimos que la API devuelve los detalles)
					if (invoiceData.detalles && invoiceData.detalles.length > 0) {
						setDetalles(invoiceData.detalles);
					}
				}
			} catch (error) {
				console.error('Error cargando datos:', error);
				toast.error('Error al cargar datos');
			} finally {
				setLoading(false);
			}
		};
		loadData();
	}, [id, isEditing]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData({ ...formData, [name]: value });
		if (errors[name]) setErrors({ ...errors, [name]: '' });
	};

	const handleDetalleChange = (index, field, value) => {
		const newDetalles = [...detalles];
		newDetalles[index][field] = value;
		// Si cambia producto, actualizar precio automáticamente
		if (field === 'producto_id') {
			const prod = productos.find((p) => p.id == value);
			if (prod) {
				newDetalles[index].precio_unitario =
					parseFloat(prod.precio_unitario) || 0;
			}
		}
		// Recalcular subtotal e IVA
		if (field === 'cantidad' || field === 'precio_unitario') {
			const cant = parseFloat(newDetalles[index].cantidad) || 0;
			const precio = parseFloat(newDetalles[index].precio_unitario) || 0;
			const subtotal = cant * precio;
			newDetalles[index].subtotal = subtotal;
			newDetalles[index].iva = subtotal * 0.13;
		}
		setDetalles(newDetalles);
	};

	const addDetalle = () => {
		setDetalles([
			...detalles,
			{ producto_id: '', cantidad: 1, precio_unitario: 0, subtotal: 0, iva: 0 },
		]);
	};

	const removeDetalle = (index) => {
		if (detalles.length === 1) return;
		setDetalles(detalles.filter((_, i) => i !== index));
	};

	const validate = () => {
		const newErrors = {};
		if (!formData.cliente_id) newErrors.cliente_id = 'Seleccione un cliente';
		let hasProducts = false;
		for (const d of detalles) {
			if (d.producto_id) {
				hasProducts = true;
				if (d.cantidad <= 0) {
					newErrors.detalles = 'Cantidad debe ser mayor a 0';
					break;
				}
				if (d.precio_unitario < 0) {
					newErrors.detalles = 'Precio no puede ser negativo';
					break;
				}
				// Verificar stock si es producto físico (opcional)
			}
		}
		if (!hasProducts) {
			newErrors.detalles = 'Debe agregar al menos un producto';
		}
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const calcularTotales = () => {
		let subtotal = 0;
		let iva = 0;
		for (const d of detalles) {
			if (d.producto_id) {
				const cant = parseFloat(d.cantidad) || 0;
				const precio = parseFloat(d.precio_unitario) || 0;
				subtotal += cant * precio;
				iva += cant * precio * 0.13;
			}
		}
		const descuento = parseFloat(formData.descuento) || 0;
		const intereses = parseFloat(formData.intereses_mora) || 0;
		const total = subtotal - descuento + iva + intereses;
		return { subtotal, iva, descuento, intereses, total };
	};

	const handleSubmit = () => {
		if (!validate()) return;
		const totals = calcularTotales();
		const payload = {
			...formData,
			subtotal_sumas: totals.subtotal,
			iva_13: totals.iva,
			total_pagar: totals.total,
			detalles: detalles.map((d) => ({
				producto_id: d.producto_id,
				cantidad: d.cantidad,
				precio_unitario: d.precio_unitario,
				subtotal: d.subtotal,
				iva: d.iva,
			})),
		};

		const action = formData.estado === 'Pagada' ? 'generar y pagar' : 'emitir';
		setConfirmModal({
			isOpen: true,
			title: 'Confirmar Factura',
			message: `¿Está seguro de ${action} esta factura por $${totals.total.toFixed(2)}?`,
			onConfirm: async () => {
				setSaving(true);
				try {
					if (isEditing) {
						await updateInvoice(id, payload);
						toast.success('Factura actualizada');
					} else {
						await createInvoice(payload);
						toast.success('Factura creada');
					}
					navigate('/facturas');
				} catch (err) {
					toast.error(err.response?.data?.message || 'Error al guardar');
				} finally {
					setSaving(false);
				}
				setConfirmModal({
					isOpen: false,
					title: '',
					message: '',
					onConfirm: null,
				});
			},
		});
	};

	const totals = calcularTotales();

	if (loading) return <LoadingSpinner />;

	return (
		<div className='p-6'>
			<div className='flex items-center gap-4 mb-6'>
				<button
					onClick={() => navigate('/facturas')}
					className='text-gray-400 hover:text-white transition'
				>
					<ArrowLeft size={24} />
				</button>
				<h1 className='text-2xl font-bold text-white'>
					{isEditing ? 'Editar Factura' : 'Nueva Factura'}
				</h1>
			</div>

			<div className='bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-6'>
				<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
					<div>
						<label className='block text-sm font-medium text-gray-300 mb-1'>
							Cliente *
						</label>
						<select
							name='cliente_id'
							value={formData.cliente_id}
							onChange={handleChange}
							className={`w-full px-3 py-2 bg-gray-700 border ${errors.cliente_id ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
						>
							<option value=''>Seleccionar</option>
							{clientes.map((c) => (
								<option key={c.id} value={c.id}>
									{c.nombre}
								</option>
							))}
						</select>
						{errors.cliente_id && (
							<p className='text-red-400 text-xs mt-1'>{errors.cliente_id}</p>
						)}
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-300 mb-1'>
							Tipo Documento
						</label>
						<select
							name='tipo_documento'
							value={formData.tipo_documento}
							onChange={handleChange}
							className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
						>
							<option value='FAF'>FAF (Consumidor Final)</option>
							<option value='CCF'>CCF (Contribuyente)</option>
						</select>
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-300 mb-1'>
							Estado
						</label>
						<select
							name='estado'
							value={formData.estado}
							onChange={handleChange}
							className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
						>
							<option value='Emitida'>Emitida (Cuentas por Cobrar)</option>
							<option value='Pagada'>Pagada</option>
							<option value='Borrador'>Borrador</option>
						</select>
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-300 mb-1'>
							Descuento ($)
						</label>
						<input
							type='number'
							min='0'
							step='0.01'
							name='descuento'
							value={formData.descuento}
							onChange={handleChange}
							className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
						/>
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-300 mb-1'>
							Intereses Mora ($)
						</label>
						<input
							type='number'
							min='0'
							step='0.01'
							name='intereses_mora'
							value={formData.intereses_mora}
							onChange={handleChange}
							className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
						/>
					</div>
				</div>

				<div className='border-t border-gray-700 pt-4'>
					<div className='flex justify-between items-center mb-2'>
						<h4 className='text-sm font-medium text-gray-300'>
							Productos / Servicios
						</h4>
						<button
							type='button'
							onClick={addDetalle}
							className='text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1'
						>
							<Plus size={16} /> Agregar producto
						</button>
					</div>
					{errors.detalles && (
						<p className='text-red-400 text-xs mb-2'>{errors.detalles}</p>
					)}
					{detalles.map((det, index) => (
						<div key={index} className='flex items-center gap-2 mb-2'>
							<select
								value={det.producto_id}
								onChange={(e) =>
									handleDetalleChange(index, 'producto_id', e.target.value)
								}
								className='flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
							>
								<option value=''>Seleccionar</option>
								{productos.map((p) => (
									<option key={p.id} value={p.id}>
										{p.nombre} (${parseFloat(p.precio_unitario).toFixed(2)})
									</option>
								))}
							</select>
							<input
								type='number'
								min='0'
								step='0.01'
								value={det.cantidad}
								onChange={(e) =>
									handleDetalleChange(
										index,
										'cantidad',
										parseFloat(e.target.value) || 0
									)
								}
								className='w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
								placeholder='Cant'
							/>
							<input
								type='number'
								min='0'
								step='0.01'
								value={det.precio_unitario}
								onChange={(e) =>
									handleDetalleChange(
										index,
										'precio_unitario',
										parseFloat(e.target.value) || 0
									)
								}
								className='w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
								placeholder='Precio'
							/>
							<span className='text-gray-300 text-sm w-20 text-right'>
								$
								{(
									parseFloat(det.cantidad) * parseFloat(det.precio_unitario) ||
									0
								).toFixed(2)}
							</span>
							{detalles.length > 1 && (
								<button
									type='button'
									onClick={() => removeDetalle(index)}
									className='text-red-400 hover:text-red-300'
								>
									<Trash2 size={18} />
								</button>
							)}
						</div>
					))}
					<div className='flex justify-end text-gray-300 text-sm pt-2 border-t border-gray-700 mt-2'>
						<div className='grid grid-cols-4 gap-4'>
							<div>
								Subtotal:{' '}
								<span className='text-emerald-400'>
									${totals.subtotal.toFixed(2)}
								</span>
							</div>
							<div>
								IVA:{' '}
								<span className='text-yellow-400'>
									${totals.iva.toFixed(2)}
								</span>
							</div>
							<div>
								Descuento:{' '}
								<span className='text-rose-400'>
									${totals.descuento.toFixed(2)}
								</span>
							</div>
							<div>
								Total:{' '}
								<span className='text-purple-400 font-bold'>
									${totals.total.toFixed(2)}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div className='flex justify-end space-x-3 pt-6 border-t border-gray-700 mt-4'>
					<button
						type='button'
						onClick={() => navigate('/facturas')}
						className='px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition'
					>
						Cancelar
					</button>
					<button
						type='button'
						onClick={handleSubmit}
						disabled={saving}
						className='px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50'
					>
						{saving
							? 'Guardando...'
							: isEditing
								? 'Actualizar'
								: 'Crear Factura'}
					</button>
				</div>
			</div>

			<ConfirmModal
				isOpen={confirmModal.isOpen}
				title={confirmModal.title}
				message={confirmModal.message}
				onConfirm={confirmModal.onConfirm}
				onCancel={() =>
					setConfirmModal({
						isOpen: false,
						title: '',
						message: '',
						onConfirm: null,
					})
				}
			/>
		</div>
	);
};

export default InvoiceForm;
