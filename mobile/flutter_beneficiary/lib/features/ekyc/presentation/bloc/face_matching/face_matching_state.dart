import 'package:equatable/equatable.dart';

abstract class FaceMatchingState extends Equatable {
  final String? photoPath;

  const FaceMatchingState({this.photoPath});

  @override
  List<Object?> get props => [photoPath];
}

class FaceMatchingInitial extends FaceMatchingState {
  const FaceMatchingInitial();
}

class FaceMatchingUploading extends FaceMatchingState {
  const FaceMatchingUploading({super.photoPath});
}

class FaceMatchingUploaded extends FaceMatchingState {
  const FaceMatchingUploaded({super.photoPath});
}

class FaceMatchingUploadError extends FaceMatchingState {
  final String message;

  const FaceMatchingUploadError(this.message, {super.photoPath});

  @override
  List<Object?> get props => [message, photoPath];
}
