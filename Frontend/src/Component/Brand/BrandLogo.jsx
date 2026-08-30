import PropTypes from 'prop-types';
import './brand-logo.css';

const BrandLogo = ({ className = '', showName = true, size = 40, inverse = false }) => (
  <span
    className={`brand-logo ${inverse ? 'brand-logo--inverse' : ''} ${className}`.trim()}
    style={{ '--brand-logo-size': `${size}px` }}
  >
    <img
      className="brand-logo__symbol"
      src="/brand/laundryvibes-symbol.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
    {showName && (
      <span className="brand-logo__name">
        Laundry<span>Vibes</span>
      </span>
    )}
  </span>
);

BrandLogo.propTypes = {
  className: PropTypes.string,
  showName: PropTypes.bool,
  size: PropTypes.number,
  inverse: PropTypes.bool,
};

export default BrandLogo;
