interface StatsPanelProps {
  total: number;
  onFinish: () => void;
  disabled?: boolean;
}

export default function StatsPanel({ total, onFinish, disabled }: StatsPanelProps) {
  return (
    <div className="pos-checkout-bottom">
      <div className="pos-order-details">
        <div className="pos-section-row mb-3">
          <h3 className="m-0 text-[15px] font-bold tracking-[-0.02em] text-[#17181d]">Detalle del pedido</h3>
          <span className="text-[10px] text-[#9a9ca5]">Venta actual</span>
        </div>
        <div className="pos-totals-row">
          <span>Subtotal</span>
          <strong>${total.toLocaleString()}</strong>
        </div>
        <div className="pos-totals-row">
          <span>Descuento</span>
          <strong>-$0</strong>
        </div>
        <div className="pos-totals-row">
          <span>IVA incluido</span>
          <strong>$0</strong>
        </div>
        <div className="pos-grand-total">
          <span>Total</span>
          <strong>${total.toLocaleString()}</strong>
        </div>
      </div>
      <button
        type="button"
        onClick={onFinish}
        disabled={disabled}
        className="pos-finish-btn"
      >
        <span>Finalizar venta</span>
        <span className="pos-finish-icon">→</span>
      </button>
    </div>
  );
}
