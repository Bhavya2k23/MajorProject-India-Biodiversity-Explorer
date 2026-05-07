#!/usr/bin/env python3
"""
Fine-tuning script for MobileNetV2 on a biodiversity species dataset.
Generates a synthetic dataset for demonstration and fine-tunes the model.

Usage:
    python train.py                      # Train with synthetic data
    python train.py --epochs 10         # Custom epochs
    python train.py --weights model.h5  # Start from existing weights
"""

import os
import sys
import json
import argparse
import numpy as np
from PIL import Image

# ─── Check TensorFlow ───────────────────────────────────────────
try:
    import tensorflow as tf
    tf.get_logger().setLevel("ERROR")
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    from tensorflow.keras.models import Model
    from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
    from tensorflow.keras.utils import to_categorical
    from tensorflow.keras.models import load_model
except ImportError as e:
    print(f"[train] TensorFlow not available: {e}")
    print("[train] Install with: pip install tensorflow")
    sys.exit(1)

# ─── Indian Biodiversity Species Classes ───────────────────────
SPECIES_CLASSES = [
    "Bengal Tiger", "Asiatic Lion", "Indian Elephant", "One-Horned Rhinoceros",
    "Snow Leopard", "Leopard", "Cheetah", "Wild Dog (Dhole)", "Bengal Fox",
    "Golden Jackal", "Sloth Bear", "Sun Bear", "Malabar Giant Squirrel",
    "Lion-Tailed Macaque", "Rhesus Macaque", "Hanuman Langur", "Nilgiri Langur",
    "Nilgiri Tahr", "Sambar Deer", "Spotted Deer", "Barking Deer", "Musk Deer",
    "Hog Deer", "Gaur", "Wild Buffalo", "Wild Boar", "Indian Pangolin",
    "Indian Mongoose", "Small Indian Mongoose", "Five-Striped Palm Squirrel",
    "Indian Hare", "Indian Crested Porcupine", "Asiatic Wild Ass",
    "Bactrian Camel", "Peacock", "Great Indian Bustard", "Spoon-Billed Sandpiper",
    "White-Rumped Vulture", "Red-Headed Vulture", "Bengal Florican", "Lesser Florican",
    "Sarus Crane", "Painted Stork", "Asian Openbill", "Woolly-Necked Stork",
    "Black-Headed Ibis", "Siberian Crane", "Amur Falcon", "Peregrine Falcon",
    "Himalayan Monal", "Indian Peafowl", "Red Junglefowl", "Grey Junglefowl",
    "Kalij Pheasant", "Cheer Pheasant", "Indian Pitta", "Great Hornbill",
    "Malabar Trogon", "Asian Elephant", "Ganges River Dolphin", "Finless Porpoise",
    "Olive Ridley Turtle", "Hawksbill Turtle", "Green Turtle", "Leatherback Turtle",
    "King Cobra", "Indian Cobra", "Russell's Viper", "Saw-Scaled Viper", "Krait",
    "Monitor Lizard", "Indian Gecko", "Tokay Gecko", "Indian Chameleon",
    "Water Monitor", "Indian Roofed Turtle", "Indian Star Tortoise",
    "Bull Frog", "Indian Tree Frog", "Common Toad", "Atlas Moth", "Moon Moth",
    "India's 1000+ butterfly species", "Monarch Butterfly", "Giant Wood Spider",
    "Indian Honeybee", "Bamboo", "Neem", "Banyan", "Peepal", "Tamarind",
    "Mango", "Teak", "Sal", "Shisham", "Red Sanders", "Sandalwood", "Lotus",
]

NUM_CLASSES = len(SPECIES_CLASSES)
print(f"[train] {NUM_CLASSES} species classes defined.")


def generate_synthetic_dataset(samples_per_class=30, img_size=(224, 224)):
    """
    Generate a synthetic dataset for fine-tuning.
    Creates random but realistic-looking images using random colors and noise.
    In production, replace this with real labeled images.
    """
    print(f"[train] Generating {samples_per_class} synthetic images per class...")
    X_train, y_train = [], []

    np.random.seed(42)
    for class_idx, species_name in enumerate(SPECIES_CLASSES):
        # Use class index as seed for reproducible "class-specific" patterns
        rng = np.random.RandomState(class_idx * 1000)

        for i in range(samples_per_class):
            # Generate image with class-specific color bias
            bias_r = rng.randint(50, 200)
            bias_g = rng.randint(50, 200)
            bias_b = rng.randint(50, 200)

            img = np.zeros((img_size[0], img_size[1], 3), dtype=np.uint8)
            # Base color with random noise
            noise = rng.randint(-40, 40, (img_size[0], img_size[1], 3))
            img[:, :, 0] = np.clip(bias_r + noise[:, :, 0], 0, 255)
            img[:, :, 1] = np.clip(bias_g + noise[:, :, 1], 0, 255)
            img[:, :, 2] = np.clip(bias_b + noise[:, :, 2], 0, 255)

            # Add some "structure" (horizontal bands for animal-like patterns)
            for band in range(0, img_size[0], 20):
                band_noise = rng.randint(-15, 15)
                img[band : band + 8, :, :] = np.clip(
                    img[band : band + 8, :, :] + band_noise, 0, 255
                )

            # Convert to PIL, preprocess
            pil_img = Image.fromarray(img)
            arr = np.array(pil_img, dtype=np.float32)
            arr = np.expand_dims(arr, axis=0)
            arr = preprocess_input(arr)

            X_train.append(arr)
            y_train.append(class_idx)

    X_train = np.concatenate(X_train, axis=0)
    y_train = to_categorical(y_train, num_classes=NUM_CLASSES)
    print(f"[train] Dataset shape: X={X_train.shape}, y={y_train.shape}")
    return X_train, y_train


def build_model(num_classes, existing_weights=None):
    """Build MobileNetV2 + custom classification head."""
    base = MobileNetV2(
        weights=existing_weights or "imagenet",
        include_top=False,
        input_shape=(224, 224, 3),
    )

    # Freeze base layers initially
    for layer in base.layers:
        layer.trainable = False

    x = base.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(256, activation="relu")(x)
    x = Dropout(0.5)(x)
    x = Dense(128, activation="relu")(x)
    x = Dropout(0.3)(x)
    outputs = Dense(num_classes, activation="softmax")(x)

    model = Model(inputs=base.input, outputs=outputs)
    return model


def main():
    parser = argparse.ArgumentParser(description="Fine-tune MobileNetV2 for species recognition")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--weights", type=str, default=None, help="Path to existing weights (.h5)")
    parser.add_argument("--samples", type=int, default=30, help="Synthetic samples per class")
    args = parser.parse_args()

    print("\n" + "=" * 55)
    print("  Biodiversity Species Model — Fine-tuning Script")
    print("=" * 55)

    # Generate dataset
    X_train, y_train = generate_synthetic_dataset(samples_per_class=args.samples)

    # Build model
    print(f"[train] Building model (lr={args.lr}, epochs={args.epochs})...")
    model = build_model(NUM_CLASSES, existing_weights=args.weights)
    model.compile(
        optimizer=Adam(learning_rate=args.lr),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    # Callbacks
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, "species_model.h5")
    checkpoint = ModelCheckpoint(model_path, monitor="accuracy", save_best_only=True, verbose=1)
    early_stop = EarlyStopping(monitor="accuracy", patience=3, verbose=1)

    print("[train] Starting training...")
    history = model.fit(
        X_train, y_train,
        epochs=args.epochs,
        batch_size=args.batch_size,
        callbacks=[checkpoint, early_stop],
        verbose=1,
    )

    # Save final model
    model.save(model_path)
    final_acc = history.history["accuracy"][-1]
    print(f"\n[train] Training complete! Final accuracy: {final_acc:.2%}")
    print(f"[train] Model saved to: {model_path}")

    # Save class labels mapping
    labels_path = os.path.join(script_dir, "species_labels.json")
    with open(labels_path, "w") as f:
        json.dump({str(i): name for i, name in enumerate(SPECIES_CLASSES)}, f, indent=2)
    print(f"[train] Class labels saved to: {labels_path}")
    print("=" * 55)


if __name__ == "__main__":
    main()
