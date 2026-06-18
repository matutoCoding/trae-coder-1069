import React from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import type { Package } from '@/types/ktv';

interface PackageCardProps {
  pkg: Package;
  selected?: boolean;
  onSelect: (pkg: Package) => void;
}

const PackageCard: React.FC<PackageCardProps> = ({ pkg, selected, onSelect }) => {
  return (
    <View className={classnames(styles.card, selected && styles.selected)}>
      <View className={styles.imageContainer}>
        <Image
          className={styles.image}
          src={pkg.image}
          mode="aspectFill"
          lazyLoad
        />
        {pkg.tag && (
          <View className={styles.tag}>{pkg.tag}</View>
        )}
      </View>

      <View className={styles.content}>
        <View className={styles.header}>
          <Text className={styles.name}>{pkg.name}</Text>
          {selected && (
            <View className={styles.selectedBadge}>✓ 已选</View>
          )}
        </View>

        <Text className={styles.description}>{pkg.description}</Text>

        <View className={styles.items}>
          {pkg.items.slice(0, 4).map((item, index) => (
            <Text key={index} className={styles.itemTag}>
              {item.name} ×{item.quantity}
            </Text>
          ))}
          {pkg.items.length > 4 && (
            <Text className={styles.itemTag}>+{pkg.items.length - 4}</Text>
          )}
        </View>

        <View className={styles.footer}>
          <View className={styles.priceSection}>
            <Text className={styles.price}>¥{pkg.price}</Text>
            <Text className={styles.originalPrice}>¥{pkg.originalPrice}</Text>
          </View>
          <Button
            className={classnames(styles.selectBtn, selected && styles.selected)}
            onClick={() => onSelect(pkg)}
          >
            {selected ? '已选择' : '选择套餐'}
          </Button>
        </View>
      </View>
    </View>
  );
};

export default PackageCard;
