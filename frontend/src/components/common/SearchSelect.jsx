// frontend/src/components/common/SearchSelect.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

const SearchSelect = ({
  options = [],
  value = null,
  onChange,
  onCreate,
  placeholder = 'Buscar...',
  label = '',
  allowCreate = true,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const selected = options.find(o => o.id === value);
    if (selected) {
      setInputValue(selected.nombre);
    } else {
      setInputValue('');
    }
  }, [value, options]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    const results = options.filter(o =>
      o.nombre.toLowerCase().includes(val.toLowerCase())
    );
    setFiltered(results.slice(0, 20));
    setIsOpen(true);
  };

  const handleSelect = (option) => {
    setInputValue(option.nombre);
    onChange(option.id);
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (!inputValue.trim() || !onCreate) return;
    try {
      const newItem = await onCreate(inputValue.trim());
      onChange(newItem.id);
      setInputValue(newItem.nombre);
      setIsOpen(false);
    } catch (error) {
      console.error('Error al crear:', error);
    }
  };

  const clearSelection = () => {
    setInputValue('');
    onChange(null);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && <label className="text-sm text-gray-300 block mb-1">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (inputValue === '') {
              setFiltered(options.slice(0, 20));
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 pr-8"
        />
        {inputValue && (
          <button
            onClick={clearSelection}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 && !inputValue && (
            <div className="px-3 py-2 text-gray-400">No hay opciones</div>
          )}
          {filtered.length === 0 && inputValue && !allowCreate && (
            <div className="px-3 py-2 text-gray-400">No hay resultados</div>
          )}
          {filtered.map(o => (
            <div
              key={o.id}
              onClick={() => handleSelect(o)}
              className="px-3 py-2 hover:bg-gray-600 cursor-pointer text-white"
            >
              {o.nombre}
            </div>
          ))}
          {allowCreate && inputValue && !filtered.some(o => o.nombre.toLowerCase() === inputValue.toLowerCase()) && (
            <div
              onClick={handleCreate}
              className="px-3 py-2 hover:bg-gray-600 cursor-pointer text-cyan-400 flex items-center gap-2 border-t border-gray-600"
            >
              <Plus size={16} /> Crear "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchSelect;