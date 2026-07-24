// frontend/src/components/common/ProductSearchSelect.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const ProductSearchSelect = ({ products, value, onChange, placeholder = 'Buscar producto...' }) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const selected = products.find(p => p.id === value);
    if (selected) {
      setInputValue(selected.nombre);
    } else {
      setInputValue('');
    }
  }, [value, products]);

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
    const results = products.filter(p =>
      p.nombre.toLowerCase().includes(val.toLowerCase())
    );
    setFiltered(results.slice(0, 20));
    setIsOpen(true);
    if (val === '') {
      setFiltered(products.slice(0, 20));
    }
  };

  const handleSelect = (product) => {
    setInputValue(product.nombre);
    onChange(product.id);
    setIsOpen(false);
  };

  const clearSelection = () => {
    setInputValue('');
    onChange(null);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (inputValue === '') {
              setFiltered(products.slice(0, 20));
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
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-gray-400">No hay productos</div>
          ) : (
            filtered.map(p => (
              <div
                key={p.id}
                onClick={() => handleSelect(p)}
                className="px-3 py-2 hover:bg-gray-600 cursor-pointer text-white"
              >
                {p.nombre}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearchSelect;