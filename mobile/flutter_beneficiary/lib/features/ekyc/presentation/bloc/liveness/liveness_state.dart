import 'package:equatable/equatable.dart';

enum LivenessStatus { idle, inProgress, success, failure }

class LivenessState extends Equatable {
  final List<String> gestures;
  final int currentIndex;
  final LivenessStatus status;
  final String? errorMessage;

  const LivenessState({
    required this.gestures,
    this.currentIndex = 0,
    this.status = LivenessStatus.idle,
    this.errorMessage,
  });

  String get currentGesture =>
      gestures.isNotEmpty && currentIndex < gestures.length
      ? gestures[currentIndex]
      : '';

  bool get isLastStep => currentIndex >= gestures.length - 1;

  LivenessState copyWith({
    List<String>? gestures,
    int? currentIndex,
    LivenessStatus? status,
    String? errorMessage,
  }) {
    return LivenessState(
      gestures: gestures ?? this.gestures,
      currentIndex: currentIndex ?? this.currentIndex,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [gestures, currentIndex, status, errorMessage];
}
