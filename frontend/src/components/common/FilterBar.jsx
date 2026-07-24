// frontend/src/components/common/FilterBar.jsx
import { ChevronDown, ChevronUp } from 'lucide-react';

const FilterBar = ({ children, open, onToggle }) => {
  const handleToggle = (e) => {
    e.preventDefault();
    onToggle(!open);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full text-white font-medium"
      >
        <span>🔍 Filtros</span>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default FilterBar;