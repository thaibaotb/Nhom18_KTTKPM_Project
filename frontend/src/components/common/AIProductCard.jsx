import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

const AIProductCard = ({ product }) => {
  const mainImage = product.image || product.images?.[0] || product.variants?.[0]?.images?.[0] || '/assets/images/shelves/iphone.png';
  const displayPrice = product.price || product.variants?.[0]?.options?.[0]?.price || 0;
  const stock = Number(product.stock || 0);

  return (
    <Link to={`/product/${product._id}`} className="block h-full">
      <motion.article
        whileHover={{ y: -4 }}
        className="h-full rounded-2xl border border-elppa-gray-border/70 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-lg"
      >
        <div className="aspect-4/3 bg-elppa-gray-subtle/60 flex items-center justify-center p-4">
          <img
            src={mainImage}
            alt={product.name}
            className="max-h-full max-w-full object-contain mix-blend-multiply"
          />
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-elppa-gray">
              {product.category || 'Product'}
            </p>
            <h4 className="text-sm font-semibold leading-snug text-elppa-obsidian line-clamp-2">
              {product.name}
            </h4>
          </div>

          <div className="flex items-end justify-between gap-2">
            <span className="text-sm font-bold text-elppa-obsidian">
              {formatCurrency(displayPrice)}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                stock > 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {stock > 0 ? `Còn ${stock}` : 'Hết hàng'}
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
};

export default AIProductCard;