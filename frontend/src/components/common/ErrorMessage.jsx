import React from 'react';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-[#0b0f19] p-4">
      <div className="bg-[#111827] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-rose-400 font-bold text-xs uppercase tracking-wider mb-2">Error del Sistema</h3>
        <p className="text-sm text-slate-300 mb-5 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full sm:w-auto bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all duration-150"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;